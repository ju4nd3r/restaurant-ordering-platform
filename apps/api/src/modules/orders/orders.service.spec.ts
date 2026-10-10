import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersGateway } from './orders.gateway';
import { BadRequestException } from '@nestjs/common';
import { OrderStatus, TableSessionStatus } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: {
    tableSession: { findUnique: jest.Mock };
    order: { count: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock };
    menuItem: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let ordersGateway: {
    notifyOrderCreated: jest.Mock;
    notifyOrderStatusChanged: jest.Mock;
  };

  const mockRestaurant = {
    id: 'rest-1',
    name: 'Sabor Criollo',
    taxPercentage: 8,
    defaultTipPercentage: 10,
    isActive: true,
  };

  const mockSession = {
    id: 'sess-1',
    sessionToken: 'sess_valid_token_123',
    status: TableSessionStatus.ACTIVE,
    table: {
      id: 'tbl-1',
      number: 1,
      label: 'Mesa 1',
      zone: 'Salón',
      restaurantId: 'rest-1',
      assignedWaiterId: 'waiter-1',
      isActive: true,
      restaurant: mockRestaurant,
    },
  };

  const mockMenuItem = {
    id: 'item-1',
    restaurantId: 'rest-1',
    name: 'Bandeja Paisa',
    basePriceCop: 38000,
    isAvailable: true,
    optionGroups: [
      {
        id: 'group-1',
        name: 'Término de la carne',
        options: [
          { id: 'opt-1', name: 'Bien asada', additionalPriceCop: 0 },
          { id: 'opt-2', name: 'Tres cuartos', additionalPriceCop: 2000 },
        ],
      },
    ],
    modifiers: [
      { id: 'mod-1', name: 'Aguacate extra', priceCop: 4000, isAvailable: true },
    ],
  };

  beforeEach(async () => {
    prisma = {
      tableSession: {
        findUnique: jest.fn(),
      },
      order: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      menuItem: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return callback({
            order: {
              create: jest.fn().mockResolvedValue({
                id: 'order-1',
                orderNumber: 1,
                restaurantId: 'rest-1',
                tableId: 'tbl-1',
                tableSessionId: 'sess-1',
                subtotalCop: 44000,
                taxCop: 3520,
                tipCop: 4400,
                totalCop: 51920,
                status: OrderStatus.RECEIVED,
              }),
            },
            orderStatusHistory: {
              create: jest.fn(),
            },
          });
        }
        return Promise.all(callback);
      }),
    };

    ordersGateway = {
      notifyOrderCreated: jest.fn(),
      notifyOrderStatusChanged: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrdersGateway, useValue: ordersGateway },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('createOrder', () => {
    it('throws BadRequestException if session is invalid or closed', async () => {
      prisma.tableSession.findUnique.mockResolvedValue(null);

      await expect(
        service.createOrder({
          tableSessionToken: 'invalid',
          items: [{ menuItemId: 'item-1', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if a dish is marked unavailable', async () => {
      prisma.tableSession.findUnique.mockResolvedValue(mockSession);
      prisma.menuItem.findUnique.mockResolvedValue({
        ...mockMenuItem,
        isAvailable: false,
      });

      await expect(
        service.createOrder({
          tableSessionToken: 'sess_valid_token_123',
          items: [{ menuItemId: 'item-1', quantity: 1 }],
        }),
      ).rejects.toThrow(/no está disponible/);
    });

    it('calculates integer COP prices strictly from DB and notifies via gateway', async () => {
      prisma.tableSession.findUnique.mockResolvedValue(mockSession);
      prisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);

      const order = await service.createOrder({
        tableSessionToken: 'sess_valid_token_123',
        tipPercentage: 10,
        items: [
          {
            menuItemId: 'item-1',
            quantity: 1,
            selectedOptions: [
              {
                optionGroupId: 'group-1',
                optionGroupName: 'Término de la carne',
                optionId: 'opt-2',
                optionName: 'Tres cuartos',
                additionalPriceCop: 999999, // Tampered client price must be ignored!
              },
            ],
            selectedModifiers: [
              {
                modifierId: 'mod-1',
                name: 'Aguacate extra',
                priceCop: 999999, // Tampered client price must be ignored!
              },
            ],
          },
        ],
      });

      expect(order).toBeDefined();
      expect(order.id).toBe('order-1');
      expect(ordersGateway.notifyOrderCreated).toHaveBeenCalled();
    });
  });

  describe('updateOrderStatus', () => {
    it('rejects invalid state transition backwards or from DELIVERED', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.DELIVERED,
      });

      await expect(
        service.updateOrderStatus('order-1', OrderStatus.RECEIVED),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows valid sequential status change and notifies via gateway', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        tableSessionId: 'sess-1',
        restaurantId: 'rest-1',
        status: OrderStatus.RECEIVED,
      });

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          order: {
            update: jest.fn().mockResolvedValue({
              id: 'order-1',
              tableSessionId: 'sess-1',
              restaurantId: 'rest-1',
              status: OrderStatus.IN_PREPARATION,
            }),
          },
          orderStatusHistory: {
            create: jest.fn(),
          },
        });
      });

      const updated = await service.updateOrderStatus(
        'order-1',
        OrderStatus.IN_PREPARATION,
      );

      expect(updated.status).toBe(OrderStatus.IN_PREPARATION);
      expect(ordersGateway.notifyOrderStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-1',
          newStatus: OrderStatus.IN_PREPARATION,
        }),
      );
    });
  });
});
