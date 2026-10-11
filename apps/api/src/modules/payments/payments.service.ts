import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { WompiPaymentProvider } from './providers/wompi.provider';
import { CashPaymentProvider } from './providers/cash.provider';
import { BillSplitLockService } from './bill-split-lock.service';
import { MoneyCOP } from '@restaurant/validation';
import {
  CreatePaymentResponseDTO,
  PaymentMethod,
  PaymentProviderType,
  PaymentStatus,
  SplitMode,
} from '@restaurant/types';
import {
  CreateOrderPaymentDto,
  InitBillSplitDto,
  PayBillSplitDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersGateway: OrdersGateway,
    private readonly wompiProvider: WompiPaymentProvider,
    private readonly cashProvider: CashPaymentProvider,
    private readonly lockService: BillSplitLockService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
  }

  // ============================================================================
  // SINGLE ORDER PAYMENT
  // ============================================================================

  async createOrderPayment(
    dto: CreateOrderPaymentDto,
  ): Promise<CreatePaymentResponseDTO> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        tableSession: true,
        transactions: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Pedido ${dto.orderId} no encontrado`);
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException('No se puede pagar un pedido cancelado');
    }

    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('El pedido ya se encuentra totalmente pagado');
    }

    // Calculate remaining amount
    const approvedTotal = order.transactions
      .filter((t) => t.status === 'APPROVED')
      .reduce((sum, t) => sum + t.amountCop, 0);

    const remainingToPay = order.totalCop - approvedTotal;
    if (remainingToPay <= 0) {
      throw new BadRequestException('No hay saldo pendiente por pagar');
    }

    // Proportional breakdown for the payment transaction
    const ratio = remainingToPay / order.totalCop;
    const proratedSubtotal = Math.round(order.subtotalCop * ratio);
    const proratedTax = Math.round(order.taxCop * ratio);
    const proratedTip = remainingToPay - proratedSubtotal - proratedTax;

    const providerType = dto.provider || 'WOMPI';
    const method: PaymentMethod =
      dto.method || (providerType === 'CASH' ? 'CASH' : 'CARD');

    // Create unique reference for idempotency and Wompi tracking
    const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = `REF-ORD-${order.orderNumber}-${shortId}`;
    const idempotencyKey = `idem-${order.id}-${reference}`;

    const redirectUrl = `${this.frontendUrl}/m/${order.tableSession.sessionToken}?payment=callback&orderId=${order.id}&ref=${reference}`;

    const provider =
      providerType === 'WOMPI' ? this.wompiProvider : this.cashProvider;

    const providerResult = await provider.createPayment({
      reference,
      amountCop: remainingToPay,
      currency: 'COP',
      method,
      redirectUrl,
      customerEmail: dto.customerBillingData?.email,
      customerFullName: dto.customerBillingData?.fullNameOrLegalName,
      customerDocType: dto.customerBillingData?.docType,
      customerDocNumber: dto.customerBillingData?.docNumber,
    });

    // Record the transaction
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        provider: providerType,
        providerTransactionId: providerResult.providerTransactionId,
        method,
        amountCop: remainingToPay,
        subtotalCop: proratedSubtotal,
        taxCop: proratedTax,
        tipCop: proratedTip,
        status: providerResult.status,
        idempotencyKey,
        rawResponse: {
          reference,
          paymentUrl: providerResult.paymentUrl,
          ...providerResult.rawResponse,
        },
      },
    });

    // If CASH: Kitchen immediately receives note that cash payment is pending at cashier
    if (providerType === 'CASH') {
      if (order.status === 'PENDING_PAYMENT') {
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'RECEIVED',
            customerNotes: order.customerNotes
              ? `${order.customerNotes} [Pago pendiente en caja]`
              : '[Pago pendiente en caja]',
          },
        });

        this.ordersGateway.notifyOrderStatusChanged({
          orderId: order.id,
          tableSessionId: order.tableSessionId,
          restaurantId: order.restaurantId,
          newStatus: 'RECEIVED',
          updatedAt: new Date().toISOString(),
        });
      }

      this.ordersGateway.notifyPaymentUpdated({
        orderId: order.id,
        tableSessionId: order.tableSessionId,
        restaurantId: order.restaurantId,
        paymentStatus: 'UNPAID',
        transaction: {
          id: transaction.id,
          method: 'CASH',
          amountCop: transaction.amountCop,
          status: 'PENDING',
        },
      });
    }

    return {
      transactionId: transaction.id,
      orderId: order.id,
      status: transaction.status,
      amountCop: transaction.amountCop,
      provider: transaction.provider,
      method: transaction.method,
      reference,
      paymentUrl: providerResult.paymentUrl,
    };
  }

  // ============================================================================
  // BILL SPLITTING
  // ============================================================================

  async initBillSplit(dto: InitBillSplitDto) {
    const session = await this.prisma.tableSession.findUnique({
      where: { id: dto.tableSessionId },
      include: {
        orders: {
          where: { status: { not: 'CANCELLED' } },
          include: {
            items: {
              include: {
                modifiers: true,
                options: true,
              },
            },
          },
        },
        billSplits: {
          where: { status: 'OPEN' },
          include: {
            allocations: true,
            transactions: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Sesión de mesa ${dto.tableSessionId} no encontrada`);
    }

    // If an open bill split exists with the same mode, return it
    const existingOpen = session.billSplits.find((s) => s.status === 'OPEN');
    if (existingOpen) {
      return existingOpen;
    }

    // Calculate total bill amount across all orders in session
    const totalAmountCop = session.orders.reduce((sum, o) => sum + o.totalCop, 0);
    const subtotalCop = session.orders.reduce((sum, o) => sum + o.subtotalCop, 0);
    const taxAmountCop = session.orders.reduce((sum, o) => sum + o.taxCop, 0);
    const tipAmountCop = session.orders.reduce((sum, o) => sum + o.tipCop, 0);

    if (totalAmountCop <= 0) {
      throw new BadRequestException('No hay pedidos activos para dividir en esta mesa');
    }

    const billSplit = await this.prisma.billSplit.create({
      data: {
        tableSessionId: session.id,
        mode: dto.mode,
        totalAmountCop,
        taxAmountCop,
        tipAmountCop,
        status: 'OPEN',
      },
      include: {
        allocations: true,
        transactions: true,
      },
    });

    this.ordersGateway.notifySplitUpdated(session.id, billSplit);
    return billSplit;
  }

  async getBillSplit(tableSessionId: string) {
    const split = await this.prisma.billSplit.findFirst({
      where: { tableSessionId, status: 'OPEN' },
      include: {
        allocations: true,
        transactions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!split) {
      return null;
    }

    return split;
  }

  async lockItem(tableSessionId: string, orderItemId: string, participantId: string) {
    // Check if the item is already paid
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
    });

    if (!item) {
      throw new NotFoundException(`Ítem de pedido ${orderItemId} no encontrado`);
    }

    if (item.isPaid) {
      throw new BadRequestException('Este ítem ya ha sido pagado por otro comensal');
    }

    const { acquired, expiresAt } = await this.lockService.lockItem(
      tableSessionId,
      orderItemId,
      participantId,
    );

    if (!acquired) {
      throw new BadRequestException('Este ítem está siendo pagado actualmente por otro comensal');
    }

    this.ordersGateway.notifyItemLocked(tableSessionId, {
      orderItemId,
      participantId,
      expiresAt,
    });

    return { acquired: true, orderItemId, expiresAt };
  }

  async unlockItem(tableSessionId: string, orderItemId: string, participantId: string) {
    const released = await this.lockService.unlockItem(
      tableSessionId,
      orderItemId,
      participantId,
    );

    if (released) {
      this.ordersGateway.notifyItemUnlocked(tableSessionId, { orderItemId });
    }

    return { released };
  }

  async payBillSplit(dto: PayBillSplitDto): Promise<CreatePaymentResponseDTO> {
    const split = await this.prisma.billSplit.findUnique({
      where: { id: dto.billSplitId },
      include: {
        tableSession: {
          include: {
            orders: {
              where: { status: { not: 'CANCELLED' } },
              include: { items: true },
            },
          },
        },
        transactions: true,
        allocations: true,
      },
    });

    if (!split) {
      throw new NotFoundException(`División de cuenta ${dto.billSplitId} no encontrada`);
    }

    if (split.status === 'COMPLETED') {
      throw new BadRequestException('Esta división de cuenta ya fue completada');
    }

    const approvedTotal = split.transactions
      .filter((t) => t.status === 'APPROVED')
      .reduce((sum, t) => sum + t.amountCop, 0);

    const remainingTotal = split.totalAmountCop - approvedTotal;
    if (remainingTotal <= 0) {
      throw new BadRequestException('No hay saldo pendiente en esta cuenta');
    }

    let amountToPay = 0;
    let proratedSubtotal = 0;
    let proratedTax = 0;
    let proratedTip = 0;

    // Handle split mode
    if (split.mode === 'BY_ITEMS') {
      if (!dto.selectedItemIds || dto.selectedItemIds.length === 0) {
        throw new BadRequestException('Debe seleccionar al menos un plato/ítem para pagar');
      }

      // Collect items
      const allItems = split.tableSession.orders.flatMap((o) => o.items);
      const selectedItems = allItems.filter((i) => dto.selectedItemIds!.includes(i.id));

      if (selectedItems.length !== dto.selectedItemIds.length) {
        throw new BadRequestException('Uno o más ítems seleccionados no pertenecen a esta mesa');
      }

      for (const it of selectedItems) {
        if (it.isPaid) {
          throw new BadRequestException(`El plato "${it.id}" ya fue pagado`);
        }
      }

      const itemsSubtotal = selectedItems.reduce((sum, it) => sum + it.totalPriceCop, 0);
      const billSubtotal = split.totalAmountCop - split.taxAmountCop - split.tipAmountCop;

      // Prorate taxes and tip based on item subtotal ratio
      const ratio = billSubtotal > 0 ? itemsSubtotal / billSubtotal : 0;
      proratedSubtotal = itemsSubtotal;
      proratedTax = Math.round(split.taxAmountCop * ratio);
      proratedTip = Math.round(split.tipAmountCop * ratio);
      amountToPay = proratedSubtotal + proratedTax + proratedTip;
    } else if (split.mode === 'EQUAL_PARTS') {
      // Split into equal parts using Largest Remainder
      const parts = 2; // Default or configured parts
      const quotas = MoneyCOP.splitEqual(split.totalAmountCop, parts);
      const paidQuotasCount = split.transactions.filter((t) => t.status === 'APPROVED').length;
      if (paidQuotasCount >= quotas.length) {
        throw new BadRequestException('Todas las cuotas iguales ya han sido pagadas');
      }

      amountToPay = quotas[paidQuotasCount] ?? quotas[0]!;
      const ratio = amountToPay / split.totalAmountCop;
      proratedSubtotal = Math.round((split.totalAmountCop - split.taxAmountCop - split.tipAmountCop) * ratio);
      proratedTax = Math.round(split.taxAmountCop * ratio);
      proratedTip = amountToPay - proratedSubtotal - proratedTax;
    } else if (split.mode === 'CUSTOM_AMOUNT') {
      if (!dto.customAmountCop || dto.customAmountCop <= 0) {
        throw new BadRequestException('El monto personalizado debe ser mayor a 0');
      }
      if (dto.customAmountCop > remainingTotal) {
        throw new BadRequestException(`El monto supera el saldo pendiente de ${remainingTotal} COP`);
      }

      amountToPay = dto.customAmountCop;
      const ratio = amountToPay / split.totalAmountCop;
      proratedSubtotal = Math.round((split.totalAmountCop - split.taxAmountCop - split.tipAmountCop) * ratio);
      proratedTax = Math.round(split.taxAmountCop * ratio);
      proratedTip = amountToPay - proratedSubtotal - proratedTax;
    }

    const providerType = dto.provider || 'WOMPI';
    const method: PaymentMethod =
      dto.method || (providerType === 'CASH' ? 'CASH' : 'CARD');

    const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = `REF-SPLIT-${shortId}`;
    const idempotencyKey = `idem-${split.id}-${reference}`;

    const redirectUrl = `${this.frontendUrl}/m/${split.tableSession.sessionToken}?payment=callback&splitId=${split.id}&ref=${reference}`;

    const provider =
      providerType === 'WOMPI' ? this.wompiProvider : this.cashProvider;

    const providerResult = await provider.createPayment({
      reference,
      amountCop: amountToPay,
      currency: 'COP',
      method,
      redirectUrl,
      customerEmail: dto.customerBillingData?.email,
      customerFullName: dto.customerBillingData?.fullNameOrLegalName,
      customerDocType: dto.customerBillingData?.docType,
      customerDocNumber: dto.customerBillingData?.docNumber,
    });

    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        billSplitId: split.id,
        provider: providerType,
        providerTransactionId: providerResult.providerTransactionId,
        method,
        amountCop: amountToPay,
        subtotalCop: proratedSubtotal,
        taxCop: proratedTax,
        tipCop: proratedTip,
        status: providerResult.status,
        idempotencyKey,
        rawResponse: {
          reference,
          participantId: dto.participantId,
          selectedItemIds: dto.selectedItemIds,
          paymentUrl: providerResult.paymentUrl,
          ...providerResult.rawResponse,
        },
      },
    });

    // If BY_ITEMS, create item allocations
    if (split.mode === 'BY_ITEMS' && dto.selectedItemIds) {
      for (const itemId of dto.selectedItemIds) {
        await this.prisma.billSplitItemAllocation.create({
          data: {
            billSplitId: split.id,
            orderItemId: itemId,
            participantId: dto.participantId,
            fraction: 1.0,
          },
        });
      }
    }

    return {
      transactionId: transaction.id,
      billSplitId: split.id,
      status: transaction.status,
      amountCop: transaction.amountCop,
      provider: transaction.provider,
      method: transaction.method,
      reference,
      paymentUrl: providerResult.paymentUrl,
    };
  }

  // ============================================================================
  // WEBHOOK & RECONCILIATION
  // ============================================================================

  async processWompiWebhook(payload: Record<string, any>) {
    const webhookResult = await this.wompiProvider.processWebhook(payload);
    if (!webhookResult.isValid || !webhookResult.reference) {
      return { success: false, reason: 'Firma o payload no válido' };
    }

    // Find transaction by reference in rawResponse or idempotencyKey
    const reference = webhookResult.reference;
    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        OR: [
          { idempotencyKey: { contains: reference } },
          { providerTransactionId: webhookResult.providerTransactionId },
        ],
      },
    });

    if (!transaction) {
      this.logger.warn(`Transacción no encontrada para referencia de webhook: ${reference}`);
      return { success: false, reason: 'Transacción no encontrada' };
    }

    // Idempotency check: if already approved, ignore duplicate webhook
    if (transaction.status === 'APPROVED') {
      return { success: true, message: 'Transacción ya procesada' };
    }

    const newStatus = webhookResult.status || 'PENDING';

    const updatedTx = await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: newStatus,
        providerTransactionId: webhookResult.providerTransactionId,
        rawResponse: {
          ...(transaction.rawResponse as Record<string, any>),
          webhookPayload: payload,
        },
      },
    });

    if (newStatus === 'APPROVED') {
      await this.handlePaymentApproved(updatedTx);
    }

    return { success: true, status: newStatus };
  }

  async confirmCashPayment(transactionId: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transacción ${transactionId} no encontrada`);
    }

    if (transaction.status === 'APPROVED') {
      return transaction;
    }

    const updatedTx = await this.prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'APPROVED',
      },
    });

    await this.handlePaymentApproved(updatedTx);
    return updatedTx;
  }

  async verifyPayment(transactionId: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transacción ${transactionId} no encontrada`);
    }

    if (
      transaction.status === 'PENDING' &&
      transaction.provider === 'WOMPI' &&
      transaction.providerTransactionId
    ) {
      try {
        const result = await this.wompiProvider.verifyTransaction(
          transaction.providerTransactionId,
        );
        if (result.status !== transaction.status) {
          const updatedTx = await this.prisma.paymentTransaction.update({
            where: { id: transaction.id },
            data: { status: result.status },
          });

          if (result.status === 'APPROVED') {
            await this.handlePaymentApproved(updatedTx);
          }
          return updatedTx;
        }
      } catch (err) {
        this.logger.warn(`No se pudo verificar Wompi en línea: ${err}`);
      }
    }

    return transaction;
  }

  // ============================================================================
  // INTERNAL APPROVAL & RECONCILIATION
  // ============================================================================

  private async handlePaymentApproved(transaction: {
    id: string;
    orderId: string | null;
    billSplitId: string | null;
    amountCop: number;
    rawResponse: any;
  }) {
    // 1. Single Order Payment Reconciliation
    if (transaction.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: transaction.orderId },
        include: { transactions: true },
      });

      if (order) {
        const approvedSum = order.transactions
          .filter((t) => t.status === 'APPROVED' || t.id === transaction.id)
          .reduce((sum, t) => sum + t.amountCop, 0);

        const isFullyPaid = approvedSum >= order.totalCop;
        const newPaymentStatus = isFullyPaid ? 'PAID' : 'PARTIALLY_PAID';

        // Advance order to RECEIVED if it was PENDING_PAYMENT
        const newOrderStatus =
          order.status === 'PENDING_PAYMENT' ? 'RECEIVED' : order.status;

        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: newPaymentStatus,
            status: newOrderStatus,
            items: isFullyPaid
              ? {
                  updateMany: {
                    where: {},
                    data: { isPaid: true },
                  },
                }
              : undefined,
          },
        });

        this.ordersGateway.notifyPaymentUpdated({
          orderId: order.id,
          tableSessionId: order.tableSessionId,
          restaurantId: order.restaurantId,
          paymentStatus: newPaymentStatus,
          transaction: {
            id: transaction.id,
            amountCop: transaction.amountCop,
            status: 'APPROVED',
          },
        });

        if (newOrderStatus !== order.status) {
          this.ordersGateway.notifyOrderStatusChanged({
            orderId: order.id,
            tableSessionId: order.tableSessionId,
            restaurantId: order.restaurantId,
            newStatus: newOrderStatus,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    // 2. Bill Split Reconciliation
    if (transaction.billSplitId) {
      const split = await this.prisma.billSplit.findUnique({
        where: { id: transaction.billSplitId },
        include: {
          transactions: true,
          tableSession: {
            include: {
              orders: {
                where: { status: { not: 'CANCELLED' } },
                include: { items: true },
              },
            },
          },
        },
      });

      if (split) {
        const approvedSum = split.transactions
          .filter((t) => t.status === 'APPROVED' || t.id === transaction.id)
          .reduce((sum, t) => sum + t.amountCop, 0);

        const isCompleted = approvedSum >= split.totalAmountCop;

        if (isCompleted) {
          await this.prisma.billSplit.update({
            where: { id: split.id },
            data: { status: 'COMPLETED' },
          });

          // Mark all orders in table session as PAID
          for (const ord of split.tableSession.orders) {
            await this.prisma.order.update({
              where: { id: ord.id },
              data: {
                paymentStatus: 'PAID',
                status: ord.status === 'PENDING_PAYMENT' ? 'RECEIVED' : ord.status,
                items: {
                  updateMany: {
                    where: {},
                    data: { isPaid: true },
                  },
                },
              },
            });

            this.ordersGateway.notifyPaymentUpdated({
              orderId: ord.id,
              tableSessionId: ord.tableSessionId,
              restaurantId: ord.restaurantId,
              paymentStatus: 'PAID',
              transaction: {
                id: transaction.id,
                amountCop: transaction.amountCop,
                status: 'APPROVED',
              },
            });
          }
        }

        // If items mode, mark specific items as paid and release lock
        const raw = transaction.rawResponse as Record<string, any>;
        if (raw?.selectedItemIds && Array.isArray(raw.selectedItemIds)) {
          for (const itId of raw.selectedItemIds) {
            await this.prisma.orderItem.update({
              where: { id: itId },
              data: { isPaid: true },
            });
            await this.lockService.unlockItem(split.tableSessionId, itId);
          }
        }

        this.ordersGateway.notifySplitUpdated(split.tableSessionId, split);
      }
    }
  }
}
