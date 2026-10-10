import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, TableSessionStatus } from '@prisma/client';
import { CreateOrderDto } from './dto/order.dto';
import { OrdersGateway } from './orders.gateway';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersGateway: OrdersGateway,
  ) {}

  // ============================================================================
  // CREATE ORDER WITH STRICT BACKEND PRICING & TRANSACTION INTEGRITY
  // ============================================================================

  async createOrder(dto: CreateOrderDto, tableSessionTokenFromCookie?: string) {
    const sessionToken = dto.tableSessionToken || tableSessionTokenFromCookie;
    if (!sessionToken) {
      throw new BadRequestException('Token de sesión de mesa requerido para crear pedido');
    }

    // 1. Resolve active table session
    const session = await this.prisma.tableSession.findUnique({
      where: { sessionToken },
      include: {
        table: {
          include: {
            restaurant: true,
            assignedWaiter: true,
          },
        },
      },
    });

    if (
      !session ||
      session.status !== TableSessionStatus.ACTIVE ||
      !session.table.isActive ||
      !session.table.restaurant.isActive
    ) {
      throw new BadRequestException('Sesión de mesa no encontrada, expirada o cerrada');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El pedido debe incluir al menos un plato');
    }

    const restaurant = session.table.restaurant;

    // 2. Compute sequential daily order number
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const countToday = await this.prisma.order.count({
      where: {
        restaurantId: restaurant.id,
        createdAt: { gte: todayStart },
      },
    });
    const orderNumber = countToday + 1;

    // 3. Verify items, options, modifiers and calculate exact integer COP subtotal
    let subtotalCop = 0;
    const preparedItems: {
      menuItemId: string;
      quantity: number;
      unitPriceCop: number;
      totalPriceCop: number;
      comment?: string | null;
      options: {
        optionGroupId: string;
        optionGroupName: string;
        optionId: string;
        optionName: string;
        additionalPriceCop: number;
      }[];
      modifiers: {
        modifierId: string;
        name: string;
        priceCop: number;
      }[];
    }[] = [];

    for (const itemDto of dto.items) {
      const menuItem = await this.prisma.menuItem.findUnique({
        where: { id: itemDto.menuItemId },
        include: {
          optionGroups: { include: { options: true } },
          modifiers: true,
        },
      });

      if (!menuItem || menuItem.restaurantId !== restaurant.id) {
        throw new BadRequestException(
          `El plato con ID "${itemDto.menuItemId}" no existe en este restaurante`,
        );
      }

      if (!menuItem.isAvailable) {
        throw new BadRequestException(
          `El plato "${menuItem.name}" no está disponible actualmente en la cocina`,
        );
      }

      let unitPrice = menuItem.basePriceCop;

      // Verify options
      const verifiedOptions: {
        optionGroupId: string;
        optionGroupName: string;
        optionId: string;
        optionName: string;
        additionalPriceCop: number;
      }[] = [];

      if (itemDto.selectedOptions) {
        for (const selOpt of itemDto.selectedOptions) {
          const group = menuItem.optionGroups.find((g) => g.id === selOpt.optionGroupId);
          if (!group) {
            throw new BadRequestException(
              `Grupo de opciones "${selOpt.optionGroupName}" inválido para "${menuItem.name}"`,
            );
          }
          const opt = group.options.find((o) => o.id === selOpt.optionId);
          if (!opt) {
            throw new BadRequestException(
              `Opción "${selOpt.optionName}" no encontrada en el grupo "${group.name}"`,
            );
          }
          unitPrice += opt.additionalPriceCop;
          verifiedOptions.push({
            optionGroupId: group.id,
            optionGroupName: group.name,
            optionId: opt.id,
            optionName: opt.name,
            additionalPriceCop: opt.additionalPriceCop,
          });
        }
      }

      // Verify modifiers
      const verifiedModifiers: {
        modifierId: string;
        name: string;
        priceCop: number;
      }[] = [];

      if (itemDto.selectedModifiers) {
        for (const selMod of itemDto.selectedModifiers) {
          const mod = menuItem.modifiers.find((m) => m.id === selMod.modifierId);
          if (!mod || !mod.isAvailable) {
            throw new BadRequestException(
              `Adicional "${selMod.name}" no está disponible para "${menuItem.name}"`,
            );
          }
          unitPrice += mod.priceCop;
          verifiedModifiers.push({
            modifierId: mod.id,
            name: mod.name,
            priceCop: mod.priceCop,
          });
        }
      }

      const itemTotal = unitPrice * itemDto.quantity;
      subtotalCop += itemTotal;

      preparedItems.push({
        menuItemId: menuItem.id,
        quantity: itemDto.quantity,
        unitPriceCop: unitPrice,
        totalPriceCop: itemTotal,
        comment: itemDto.comment ? itemDto.comment.trim() : null,
        options: verifiedOptions,
        modifiers: verifiedModifiers,
      });
    }

    // 4. Calculate tax and voluntary tip
    const taxRate = restaurant.taxPercentage;
    const tipRate =
      dto.tipPercentage !== undefined ? dto.tipPercentage : restaurant.defaultTipPercentage;

    const taxCop = Math.round(subtotalCop * (taxRate / 100));
    const tipCop = Math.round(subtotalCop * (tipRate / 100));
    const totalCop = subtotalCop + taxCop + tipCop;

    // 5. Persist order in Prisma transaction
    const initialStatus = OrderStatus.RECEIVED;

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          restaurantId: restaurant.id,
          tableId: session.table.id,
          tableSessionId: session.id,
          orderNumber,
          status: initialStatus,
          waiterId: session.table.assignedWaiterId,
          customerNotes: dto.customerNotes ? dto.customerNotes.trim() : null,
          subtotalCop,
          taxCop,
          tipCop,
          totalCop,
          statusHistory: {
            create: {
              status: initialStatus,
            },
          },
          items: {
            create: preparedItems.map((pi) => ({
              menuItemId: pi.menuItemId,
              quantity: pi.quantity,
              unitPriceCop: pi.unitPriceCop,
              totalPriceCop: pi.totalPriceCop,
              comment: pi.comment,
              options: {
                create: pi.options.map((o) => ({
                  optionGroupId: o.optionGroupId,
                  optionGroupName: o.optionGroupName,
                  optionId: o.optionId,
                  optionName: o.optionName,
                  additionalPriceCop: o.additionalPriceCop,
                })),
              },
              modifiers: {
                create: pi.modifiers.map((m) => ({
                  modifierId: m.modifierId,
                  name: m.name,
                  priceCop: m.priceCop,
                })),
              },
            })),
          },
        },
        include: {
          table: {
            select: { number: true, label: true, zone: true },
          },
          waiter: {
            select: { id: true, fullName: true },
          },
          items: {
            include: {
              menuItem: { select: { name: true, prepTimeMinutes: true } },
              options: true,
              modifiers: true,
            },
          },
        },
      });

      return order;
    });

    // 6. Broadcast real-time order creation event via WebSockets
    this.ordersGateway.notifyOrderCreated(createdOrder);

    return createdOrder;
  }

  // ============================================================================
  // QUERIES FOR CLIENT & KITCHEN
  // ============================================================================

  async getOrdersBySession(tableSessionId: string) {
    return this.prisma.order.findMany({
      where: { tableSessionId },
      orderBy: { createdAt: 'desc' },
      include: {
        table: {
          select: { number: true, label: true, zone: true },
        },
        waiter: {
          select: { id: true, fullName: true },
        },
        items: {
          include: {
            menuItem: { select: { name: true, prepTimeMinutes: true, images: { take: 1 } } },
            options: true,
            modifiers: true,
          },
        },
        statusHistory: {
          orderBy: { changedAt: 'asc' },
        },
      },
    });
  }

  async getOrderById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: {
          select: { number: true, label: true, zone: true },
        },
        waiter: {
          select: { id: true, fullName: true },
        },
        items: {
          include: {
            menuItem: { select: { name: true, prepTimeMinutes: true, images: { take: 1 } } },
            options: true,
            modifiers: true,
          },
        },
        statusHistory: {
          orderBy: { changedAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Pedido con ID "${orderId}" no encontrado`);
    }

    return order;
  }

  async getActiveOrdersForKitchen(restaurantId: string) {
    return this.prisma.order.findMany({
      where: {
        restaurantId,
        status: {
          in: [OrderStatus.RECEIVED, OrderStatus.IN_PREPARATION, OrderStatus.READY],
        },
      },
      orderBy: { createdAt: 'asc' }, // FIFO: First In, First Out
      include: {
        table: {
          select: { number: true, label: true, zone: true },
        },
        waiter: {
          select: { id: true, fullName: true },
        },
        items: {
          include: {
            menuItem: { select: { name: true, prepTimeMinutes: true } },
            options: true,
            modifiers: true,
          },
        },
      },
    });
  }

  // ============================================================================
  // STATUS TRANSITION (KDS & WAITER ACTIONS)
  // ============================================================================

  async updateOrderStatus(orderId: string, newStatus: OrderStatus, changedById?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Pedido con ID "${orderId}" no encontrado`);
    }

    // Validate sequential transitions
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING_PAYMENT]: [OrderStatus.RECEIVED, OrderStatus.CANCELLED],
      [OrderStatus.RECEIVED]: [OrderStatus.IN_PREPARATION, OrderStatus.CANCELLED],
      [OrderStatus.IN_PREPARATION]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Transición de estado no permitida de "${order.status}" a "${newStatus}"`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
        },
        include: {
          table: true,
          items: {
            include: {
              menuItem: true,
              options: true,
              modifiers: true,
            },
          },
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: newStatus,
          changedById,
        },
      });

      return ord;
    });

    // Broadcast status change in real time
    this.ordersGateway.notifyOrderStatusChanged({
      orderId: updated.id,
      tableSessionId: updated.tableSessionId,
      restaurantId: updated.restaurantId,
      newStatus,
      updatedAt: new Date().toISOString(),
    });

    return updated;
  }
}
