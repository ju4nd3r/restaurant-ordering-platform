import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FakeInvoiceProvider } from './providers/fake-invoice.provider';
import { LocalStorageService } from '../storage/local-storage.service';
import { MailService } from './mail.service';
import { RequestElectronicInvoiceDto, QueryInvoicesDto } from './dto/invoice.dto';
import { CustomerDocType, InvoiceStatus } from '@prisma/client';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fakeInvoiceProvider: FakeInvoiceProvider,
    private readonly storageService: LocalStorageService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Generates or retrieves Colombian Electronic Invoice (Factura Electrónica DIAN)
   */
  async requestInvoice(dto: RequestElectronicInvoiceDto) {
    const { billingData, orderId } = dto;

    // Validate Habeas Data acceptance for personal data (Ley 1581 de 2012)
    if (!billingData.isFinalConsumer && !billingData.habeasDataAccepted) {
      throw new BadRequestException(
        'Debe aceptar expresamente la política de tratamiento de datos personales (Habeas Data - Ley 1581 de 2012) para emitir la factura electrónica a su nombre',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: true,
        items: {
          include: { menuItem: true },
        },
        transactions: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Pedido ${orderId} no encontrado`);
    }

    // Identify payment transaction
    let transaction = order.transactions.find((t) => t.status === 'APPROVED');
    if (!transaction && dto.transactionId) {
      transaction = order.transactions.find((t) => t.id === dto.transactionId);
    }
    if (!transaction && order.transactions.length > 0) {
      transaction = order.transactions[0];
    }

    // If order was paid without transaction record (e.g. cash on POS), create a settled transaction
    if (!transaction) {
      transaction = await this.prisma.paymentTransaction.create({
        data: {
          orderId: order.id,
          provider: 'CASH',
          method: 'CASH',
          amountCop: order.totalCop,
          subtotalCop: order.subtotalCop,
          taxCop: order.taxCop,
          tipCop: order.tipCop,
          status: 'APPROVED',
          idempotencyKey: `tx-inv-${order.id}-${Date.now()}`,
        },
      });
    }

    // Idempotency: Check if an electronic invoice was already issued for this transaction
    const existingInvoice = await this.prisma.electronicInvoice.findUnique({
      where: { paymentTransactionId: transaction.id },
    });

    if (existingInvoice) {
      this.logger.log(`Factura electrónica existente retornada para pedido ${order.id}: ${existingInvoice.invoiceNumber}`);
      return existingInvoice;
    }

    // Resolve next sequential invoice number for restaurant
    const count = await this.prisma.electronicInvoice.count({
      where: { restaurantId: order.restaurantId },
    });

    const prefix = order.restaurant.dianPrefix || 'FE';
    const invoiceNumber = `${prefix}-${(count + 1).toString().padStart(6, '0')}`;

    // Prepare items line for invoice
    const itemLines = order.items.map((it) => ({
      name: it.menuItem.name,
      quantity: it.quantity,
      unitPriceCop: it.unitPriceCop,
      totalPriceCop: it.totalPriceCop,
      taxCop: Math.round(it.totalPriceCop * 0.08),
    }));

    const customerDocType = (billingData.isFinalConsumer
      ? 'FINAL_CONSUMER'
      : billingData.docType || 'CC') as CustomerDocType;

    const customerDocNumber = billingData.isFinalConsumer
      ? '222222222222'
      : billingData.docNumber || '222222222222';

    const customerLegalName = billingData.isFinalConsumer
      ? 'Consumidor Final'
      : billingData.fullNameOrLegalName || 'Consumidor Final';

    // Issue invoice with Fake DIAN Provider (computes CUFE SHA-384, QR code, UBL 2.1 XML, PDF)
    const issueResult = await this.fakeInvoiceProvider.issueInvoice({
      invoiceNumber,
      issuedAt: new Date(),
      restaurant: {
        id: order.restaurant.id,
        name: order.restaurant.name,
        nit: '901.458.789-1', // Default NIT restaurant
        address: order.restaurant.address,
        phone: order.restaurant.phone,
        email: 'facturacion@restaurante.com.co',
        taxType: order.restaurant.taxType,
        taxPercentage: order.restaurant.taxPercentage,
        dianResolutionNumber: order.restaurant.dianResolutionNumber || 'N° 18764000001 del 2026-01-15',
        dianPrefix: prefix,
      },
      customer: {
        isFinalConsumer: !!billingData.isFinalConsumer,
        docType: customerDocType,
        docNumber: customerDocNumber,
        legalName: customerLegalName,
        email: billingData.email,
        phone: billingData.phone,
        address: billingData.address,
        habeasDataAccepted: !!billingData.habeasDataAccepted,
      },
      items: itemLines,
      subtotalCop: order.subtotalCop,
      taxCop: order.taxCop,
      tipCop: order.tipCop,
      totalCop: order.totalCop,
      paymentMethod: transaction.method,
      paymentTransactionId: transaction.id,
    });

    // Store generated documents
    const pdfUrl = await this.storageService.uploadFile(
      issueResult.pdfBuffer,
      `${invoiceNumber}.pdf`,
    );

    const xmlUrl = await this.storageService.uploadFile(
      Buffer.from(issueResult.xmlContent, 'utf-8'),
      `${invoiceNumber}.xml`,
    );

    const qrCodeUrl = await this.storageService.uploadFile(
      issueResult.qrCodePngBuffer,
      `${invoiceNumber}_qr.png`,
    );

    // Save ElectronicInvoice entity
    const invoice = await this.prisma.electronicInvoice.create({
      data: {
        restaurantId: order.restaurantId,
        paymentTransactionId: transaction.id,
        invoiceNumber,
        cufe: issueResult.cufe,
        qrCodeUrl,
        pdfUrl,
        xmlUrl,
        customerDocType,
        customerDocNumber,
        customerLegalName,
        customerEmail: billingData.email,
        customerPhone: billingData.phone,
        customerAddress: billingData.address,
        subtotalCop: order.subtotalCop,
        taxCop: order.taxCop,
        tipCop: order.tipCop,
        totalCop: order.totalCop,
        status: issueResult.status as InvoiceStatus,
        dianResponse: issueResult.dianResponse,
        logs: {
          create: {
            attempt: 1,
            status: 'ISSUED',
            message: 'Documento electrónico emitido y validado exitosamente ante la DIAN',
            payload: issueResult.dianResponse,
          },
        },
      },
    });

    // Send email asynchronously if customer provided email
    if (billingData.email) {
      this.mailService
        .sendInvoiceEmail({
          to: billingData.email,
          invoiceNumber,
          restaurantName: order.restaurant.name,
          customerName: customerLegalName,
          totalCop: order.totalCop,
          pdfBuffer: issueResult.pdfBuffer,
          xmlContent: issueResult.xmlContent,
        })
        .catch((err) => {
          this.logger.warn(`Error en segundo plano despachando correo de factura: ${err?.message}`);
        });
    }

    return invoice;
  }

  async getInvoiceById(id: string) {
    const invoice = await this.prisma.electronicInvoice.findUnique({
      where: { id },
      include: {
        restaurant: true,
        transaction: true,
        logs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Factura electrónica ${id} no encontrada`);
    }

    return invoice;
  }

  async getInvoiceByOrderId(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        transactions: {
          include: { invoice: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Pedido ${orderId} no encontrado`);
    }

    const txWithInvoice = order.transactions.find((t) => t.invoice !== null);
    if (!txWithInvoice || !txWithInvoice.invoice) {
      return null;
    }

    return txWithInvoice.invoice;
  }

  async listInvoices(query: QueryInvoicesDto) {
    return this.prisma.electronicInvoice.findMany({
      where: {
        restaurantId: query.restaurantId,
        status: query.status,
        ...(query.search
          ? {
              OR: [
                { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
                { customerDocNumber: { contains: query.search, mode: 'insensitive' } },
                { customerLegalName: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { issuedAt: 'desc' },
      take: 50,
    });
  }
}
