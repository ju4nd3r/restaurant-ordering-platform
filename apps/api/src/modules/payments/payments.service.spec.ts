import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PaymentsService } from './payments.service';
import { WompiPaymentProvider } from './providers/wompi.provider';
import { CashPaymentProvider } from './providers/cash.provider';
import { BillSplitLockService } from './bill-split-lock.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { MoneyCOP } from '@restaurant/validation';

describe('Payments & Bill Splitting', () => {
  let paymentsService: PaymentsService;
  let wompiProvider: WompiPaymentProvider;
  let cashProvider: CashPaymentProvider;
  let lockService: BillSplitLockService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'NEXT_PUBLIC_WOMPI_PUBLIC_KEY':
          return 'pub_test_123';
        case 'WOMPI_PRIVATE_KEY':
          return 'prv_test_456';
        case 'WOMPI_INTEGRITY_SECRET':
          return 'test_integrity_secret';
        case 'WOMPI_EVENTS_SECRET':
          return 'test_events_secret';
        case 'FRONTEND_URL':
          return 'http://localhost:3001';
        case 'REDIS_URL':
          return 'redis://localhost:6381';
        default:
          return undefined;
      }
    }),
  };

  const mockPrismaService = {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    orderItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    tableSession: {
      findUnique: jest.fn(),
    },
    billSplit: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    billSplitItemAllocation: {
      create: jest.fn(),
    },
    paymentTransaction: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockOrdersGateway = {
    notifyPaymentUpdated: jest.fn(),
    notifyOrderStatusChanged: jest.fn(),
    notifyItemLocked: jest.fn(),
    notifyItemUnlocked: jest.fn(),
    notifySplitUpdated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        WompiPaymentProvider,
        CashPaymentProvider,
        BillSplitLockService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OrdersGateway, useValue: mockOrdersGateway },
      ],
    }).compile();

    paymentsService = module.get<PaymentsService>(PaymentsService);
    wompiProvider = module.get<WompiPaymentProvider>(WompiPaymentProvider);
    cashProvider = module.get<CashPaymentProvider>(CashPaymentProvider);
    lockService = module.get<BillSplitLockService>(BillSplitLockService);

    await lockService.onModuleInit();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await lockService.onModuleDestroy();
  });

  // ============================================================================
  // 1. WOMPI PROVIDER & CRYPTOGRAPHY
  // ============================================================================
  describe('WompiPaymentProvider', () => {
    it('debe calcular la firma de integridad SHA256 exactamente como lo requiere Wompi', () => {
      const reference = 'ORDER-123';
      const amountCop = 50000;
      const amountInCents = 5000000;
      const expectedChain = `${reference}${amountInCents}COPtest_integrity_secret`;
      const expectedHash = crypto.createHash('sha256').update(expectedChain).digest('hex');

      const signature = wompiProvider.generateIntegritySignature(reference, amountCop);
      expect(signature).toBe(expectedHash);
    });

    it('debe generar una URL de Checkout Wompi válida y con los parámetros correctos', () => {
      const reference = 'REF-TEST-001';
      const amountCop = 25000;
      const redirectUrl = 'http://localhost:3001/m/token?order=1';

      const checkoutUrl = wompiProvider.generateCheckoutUrl(reference, amountCop, redirectUrl);

      expect(checkoutUrl).toContain('https://checkout.wompi.co/p/?');
      expect(checkoutUrl).toContain('public-key=pub_test_123');
      expect(checkoutUrl).toContain('amount-in-cents=2500000');
      expect(checkoutUrl).toContain('currency=COP');
      expect(checkoutUrl).toContain('reference=REF-TEST-001');
      expect(checkoutUrl).toContain('signature%3Aintegrity=');
    });

    it('debe validar exitosamente un webhook de Wompi con firma criptográfica válida', async () => {
      const timestamp = 1712000000;
      const transactionId = 'wompi-tx-999';
      const status = 'APPROVED';
      const amountInCents = 4500000;

      const chain = `${transactionId}${status}${amountInCents}${timestamp}test_events_secret`;
      const validChecksum = crypto.createHash('sha256').update(chain).digest('hex');

      const payload = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: transactionId,
            status,
            amount_in_cents: amountInCents,
            reference: 'REF-ORD-1-ABC',
          },
        },
        timestamp,
        signature: {
          properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
          checksum: validChecksum,
        },
      };

      const result = await wompiProvider.processWebhook(payload);
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('APPROVED');
      expect(result.amountCop).toBe(45000);
      expect(result.reference).toBe('REF-ORD-1-ABC');
    });

    it('debe rechazar un webhook de Wompi con checksum inválido', async () => {
      const payload = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'tx-1',
            status: 'APPROVED',
            amount_in_cents: 100000,
          },
        },
        timestamp: 1712000000,
        signature: {
          properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
          checksum: 'invalid_checksum_hash_1234567890abcdef',
        },
      };

      const result = await wompiProvider.processWebhook(payload);
      expect(result.isValid).toBe(false);
    });
  });

  // ============================================================================
  // 2. CASH PAYMENT PROVIDER
  // ============================================================================
  describe('CashPaymentProvider', () => {
    it('debe crear una transacción en estado PENDING para pago en efectivo', async () => {
      const result = await cashProvider.createPayment({
        reference: 'REF-CASH-1',
        amountCop: 35000,
        currency: 'COP',
        method: 'CASH',
        redirectUrl: 'http://localhost:3001',
      });

      expect(result.provider).toBe('CASH');
      expect(result.status).toBe('PENDING');
      expect(result.amountCop).toBe(35000);
    });
  });

  // ============================================================================
  // 3. CONCURRENCY LOCKING SERVICE
  // ============================================================================
  describe('BillSplitLockService', () => {
    it('debe bloquear un ítem para un comensal y rechazar bloqueo concurrente de otro', async () => {
      const session = 'session-1';
      const item = 'item-100';

      const lock1 = await lockService.lockItem(session, item, 'user-A', 60);
      expect(lock1.acquired).toBe(true);

      const lock2 = await lockService.lockItem(session, item, 'user-B', 60);
      expect(lock2.acquired).toBe(false);

      // Re-extending lock by user-A is allowed
      const lock1Again = await lockService.lockItem(session, item, 'user-A', 60);
      expect(lock1Again.acquired).toBe(true);

      // user-B cannot unlock user-A's item
      const unlockAttempt = await lockService.unlockItem(session, item, 'user-B');
      expect(unlockAttempt).toBe(false);

      // user-A unlocks
      const unlockSuccess = await lockService.unlockItem(session, item, 'user-A');
      expect(unlockSuccess).toBe(true);

      // Now user-B can lock
      const lock2Now = await lockService.lockItem(session, item, 'user-B', 60);
      expect(lock2Now.acquired).toBe(true);
    });
  });

  // ============================================================================
  // 4. PAYMENTS SERVICE - ORDER PAYMENT & RECONCILIATION
  // ============================================================================
  describe('PaymentsService - Pago de Pedido', () => {
    it('debe crear un pago Wompi para un pedido pendiente', async () => {
      const mockOrder = {
        id: 'ord-1',
        orderNumber: 5,
        totalCop: 60000,
        subtotalCop: 50000,
        taxCop: 4000,
        tipCop: 6000,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'UNPAID',
        restaurantId: 'resto-1',
        tableSessionId: 'sess-1',
        tableSession: { sessionToken: 'tok-abc' },
        transactions: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.paymentTransaction.create.mockResolvedValue({
        id: 'tx-1',
        orderId: 'ord-1',
        provider: 'WOMPI',
        method: 'CARD',
        amountCop: 60000,
        status: 'PENDING',
      });

      const result = await paymentsService.createOrderPayment({
        orderId: 'ord-1',
        provider: 'WOMPI',
        method: 'CARD',
      });

      expect(result.amountCop).toBe(60000);
      expect(result.status).toBe('PENDING');
      expect(result.paymentUrl).toBeDefined();
      expect(mockPrismaService.paymentTransaction.create).toHaveBeenCalled();
    });

    it('debe rechazar pagar un pedido que ya está marcado como PAID', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'ord-paid',
        paymentStatus: 'PAID',
        transactions: [],
      });

      await expect(
        paymentsService.createOrderPayment({
          orderId: 'ord-paid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe avanzar el estado a RECEIVED y notificar socket cuando se elige Pagar en Caja', async () => {
      const mockOrder = {
        id: 'ord-cash',
        orderNumber: 6,
        totalCop: 40000,
        subtotalCop: 35000,
        taxCop: 2800,
        tipCop: 2200,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'UNPAID',
        customerNotes: 'Sin sal',
        restaurantId: 'resto-1',
        tableSessionId: 'sess-1',
        tableSession: { sessionToken: 'tok-xyz' },
        transactions: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue({ ...mockOrder, status: 'RECEIVED' });
      mockPrismaService.paymentTransaction.create.mockResolvedValue({
        id: 'tx-cash-1',
        orderId: 'ord-cash',
        provider: 'CASH',
        method: 'CASH',
        amountCop: 40000,
        status: 'PENDING',
      });

      const result = await paymentsService.createOrderPayment({
        orderId: 'ord-cash',
        provider: 'CASH',
        method: 'CASH',
      });

      expect(result.provider).toBe('CASH');
      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord-cash' },
          data: expect.objectContaining({ status: 'RECEIVED' }),
        }),
      );
      expect(mockOrdersGateway.notifyOrderStatusChanged).toHaveBeenCalled();
    });

    it('debe conciliar webhook aprobado cambiando el pedido a PAID y emitiendo sockets', async () => {
      const timestamp = 1712000000;
      const chain = `tx-wompi-55APPROVED5000000${timestamp}test_events_secret`;
      const checksum = crypto.createHash('sha256').update(chain).digest('hex');

      const webhookPayload = {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'tx-wompi-55',
            status: 'APPROVED',
            amount_in_cents: 5000000,
            reference: 'REF-ORD-5-XYZ',
          },
        },
        timestamp,
        signature: {
          properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
          checksum,
        },
      };

      const existingTx = {
        id: 'db-tx-55',
        orderId: 'ord-55',
        billSplitId: null,
        status: 'PENDING',
        amountCop: 50000,
        rawResponse: {},
      };

      const orderInDb = {
        id: 'ord-55',
        totalCop: 50000,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'UNPAID',
        restaurantId: 'resto-1',
        tableSessionId: 'sess-1',
        transactions: [existingTx],
      };

      mockPrismaService.paymentTransaction.findFirst.mockResolvedValue(existingTx);
      mockPrismaService.paymentTransaction.update.mockResolvedValue({
        ...existingTx,
        status: 'APPROVED',
      });
      mockPrismaService.order.findUnique.mockResolvedValue(orderInDb);
      mockPrismaService.order.update.mockResolvedValue({
        ...orderInDb,
        paymentStatus: 'PAID',
        status: 'RECEIVED',
      });

      const webhookResponse = await paymentsService.processWompiWebhook(webhookPayload);

      expect(webhookResponse.success).toBe(true);
      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord-55' },
          data: expect.objectContaining({ paymentStatus: 'PAID', status: 'RECEIVED' }),
        }),
      );
      expect(mockOrdersGateway.notifyPaymentUpdated).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 5. BILL SPLITTING (LARGEST REMAINDER METHOD)
  // ============================================================================
  describe('División de cuentas y Algoritmo Largest Remainder', () => {
    it('debe dividir en partes iguales sin perder ningún peso en COP', () => {
      // Total 100,001 COP dividido entre 3 personas: 33,334 + 33,334 + 33,333 = 100,001
      const parts = MoneyCOP.splitEqual(100001, 3);
      expect(parts).toHaveLength(3);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(100001);
      expect(parts[0]).toBe(33334);
      expect(parts[1]).toBe(33334);
      expect(parts[2]).toBe(33333);
    });

    it('debe prorratear propina e impuesto proporcionalmente sin perder pesos', () => {
      // Items: 30,000 COP y 70,000 COP. Propina total: 10,000 COP
      const items = [30000, 70000];
      const tipTotal = 10000;
      const prorated = MoneyCOP.prorate(tipTotal, items);

      expect(prorated).toEqual([3000, 7000]);
      expect(prorated.reduce((a, b) => a + b, 0)).toBe(tipTotal);
    });
  });
});
