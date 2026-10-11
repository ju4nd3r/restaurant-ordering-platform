import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { FakeInvoiceProvider } from './providers/fake-invoice.provider';
import { LocalStorageService } from '../storage/local-storage.service';
import { MailService } from './mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

describe('InvoicesService & Electronic Invoicing (DIAN)', () => {
  let service: InvoicesService;
  let fakeProvider: FakeInvoiceProvider;
  let mailService: MailService;

  const mockPrismaService = {
    order: {
      findUnique: jest.fn(),
    },
    paymentTransaction: {
      create: jest.fn(),
    },
    electronicInvoice: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockStorageService = {
    uploadFile: jest.fn((buf: Buffer, filename: string) => Promise.resolve(`/api/uploads/${filename}`)),
  };

  const mockMailService = {
    sendInvoiceEmail: jest.fn(() => Promise.resolve(true)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        FakeInvoiceProvider,
        { provide: LocalStorageService, useValue: mockStorageService },
        { provide: MailService, useValue: mockMailService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    fakeProvider = module.get<FakeInvoiceProvider>(FakeInvoiceProvider);
    mailService = module.get<MailService>(MailService);

    jest.clearAllMocks();
  });

  describe('FakeInvoiceProvider - DIAN Algorithm Standards', () => {
    const sampleParams = {
      invoiceNumber: 'FE-000001',
      issuedAt: new Date('2026-10-10T12:00:00.000Z'),
      restaurant: {
        id: 'resto-1',
        name: 'Sabor Criollo',
        nit: '901.458.789-1',
        address: 'Calle 85 # 14-25',
        phone: '+57 310 555 4321',
        email: 'info@restaurante.com',
        taxType: 'INC_8',
        taxPercentage: 8,
        technicalKey: 'test_technical_key_dian',
      },
      customer: {
        isFinalConsumer: false,
        docType: 'CC',
        docNumber: '1020304050',
        legalName: 'Juan Pérez',
        email: 'juan@example.com',
        habeasDataAccepted: true,
      },
      items: [
        {
          name: 'Bandeja Paisa',
          quantity: 1,
          unitPriceCop: 42000,
          totalPriceCop: 42000,
          taxCop: 3360,
        },
      ],
      subtotalCop: 42000,
      taxCop: 3360,
      tipCop: 4200,
      totalCop: 49560,
      paymentMethod: 'CARD',
      paymentTransactionId: 'tx-123',
    };

    it('debe generar un CUFE SHA-384 válido con 96 caracteres hexadecimales', () => {
      const cufe = fakeProvider.generateCufe(sampleParams);
      expect(cufe).toHaveLength(96);
      expect(/^[0-9a-f]{96}$/.test(cufe)).toBe(true);

      // Verify SHA-384 math
      const expectedChain = `FE-0000012026-10-1012:00:00-05:0042000.00043360.0049560.0090145878911020304050test_technical_key_dian2`;
      const expectedHash = crypto.createHash('sha384').update(expectedChain).digest('hex');
      expect(cufe).toBe(expectedHash);
    });

    it('debe generar XML UBL 2.1 con estructura requerida por la DIAN', () => {
      const cufe = 'test_cufe_hash';
      const qrUrl = 'https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=test_cufe_hash';
      const xml = fakeProvider.generateUblXml(sampleParams, cufe, qrUrl);

      expect(xml).toContain('<cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>');
      expect(xml).toContain('<cbc:ProfileID>DIAN 2.1: Factura Electrónica de Venta</cbc:ProfileID>');
      expect(xml).toContain('<cbc:UUID schemeName="CUFE-SHA384">test_cufe_hash</cbc:UUID>');
      expect(xml).toContain('<cbc:ID>FE-000001</cbc:ID>');
      expect(xml).toContain('<cbc:ID schemeName="NIT">901.458.789-1</cbc:ID>');
      expect(xml).toContain('Bandeja Paisa');
      expect(xml).toContain('<cbc:PayableAmount currencyID="COP">49560.00</cbc:PayableAmount>');
    });

    it('debe generar el código QR oficial de la DIAN y el documento PDF', async () => {
      const result = await fakeProvider.issueInvoice(sampleParams);
      expect(result.status).toBe('ISSUED');
      expect(result.cufe).toBeDefined();
      expect(result.qrCodeData).toContain('https://catalogo-vpfe.dian.gov.co/document/searchqr');
      expect(result.qrCodePngBuffer).toBeInstanceOf(Buffer);
      expect(result.pdfBuffer).toBeInstanceOf(Buffer);
      expect(result.xmlContent).toBeDefined();
    });
  });

  describe('InvoicesService - Reglas de Negocio & Habeas Data', () => {
    it('debe rechazar la emisión si el cliente no acepta Habeas Data (Ley 1581 de 2012)', async () => {
      await expect(
        service.requestInvoice({
          orderId: 'ord-1',
          billingData: {
            isFinalConsumer: false,
            docType: 'CC',
            docNumber: '1098765432',
            fullNameOrLegalName: 'Camila Torres',
            email: 'camila@empresa.com',
            habeasDataAccepted: false, // Rejected Habeas Data
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe permitir emitir a Consumidor Final sin exigir aceptación manual de Habeas Data', async () => {
      const mockOrder = {
        id: 'ord-consumer',
        restaurantId: 'resto-1',
        subtotalCop: 20000,
        taxCop: 1600,
        tipCop: 2000,
        totalCop: 23600,
        restaurant: {
          id: 'resto-1',
          name: 'Restaurante Test',
          address: 'Cra 7 # 72-10',
          phone: '+57 300 111 2233',
          taxType: 'INC_8',
          taxPercentage: 8,
          dianPrefix: 'FE',
        },
        items: [
          {
            quantity: 1,
            unitPriceCop: 20000,
            totalPriceCop: 20000,
            menuItem: { name: 'Ajiaco Santafereño' },
          },
        ],
        transactions: [
          {
            id: 'tx-approved-1',
            status: 'APPROVED',
            method: 'CARD',
          },
        ],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.electronicInvoice.findUnique.mockResolvedValue(null);
      mockPrismaService.electronicInvoice.count.mockResolvedValue(0);
      mockPrismaService.electronicInvoice.create.mockImplementation((args) => ({
        id: 'inv-1',
        ...args.data,
      }));

      const invoice = await service.requestInvoice({
        orderId: 'ord-consumer',
        billingData: {
          isFinalConsumer: true,
          docType: 'FINAL_CONSUMER',
          docNumber: '222222222222',
          fullNameOrLegalName: 'Consumidor Final',
          habeasDataAccepted: false,
        },
      });

      expect(invoice).toBeDefined();
      expect(invoice.invoiceNumber).toBe('FE-000001');
      expect(invoice.customerDocNumber).toBe('222222222222');
      expect(invoice.status).toBe('ISSUED');
      expect(mockStorageService.uploadFile).toHaveBeenCalledTimes(3); // PDF, XML, QR
    });

    it('debe ser idempotente y no crear duplicados si ya se emitió factura para la transacción', async () => {
      const mockOrder = {
        id: 'ord-idemp',
        restaurantId: 'resto-1',
        transactions: [
          {
            id: 'tx-already-invoiced',
            status: 'APPROVED',
          },
        ],
      };

      const existingInvoice = {
        id: 'inv-existing',
        invoiceNumber: 'FE-000088',
        cufe: 'existing_cufe_sha384',
        status: 'ISSUED',
        paymentTransactionId: 'tx-already-invoiced',
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.electronicInvoice.findUnique.mockResolvedValue(existingInvoice);

      const result = await service.requestInvoice({
        orderId: 'ord-idemp',
        billingData: {
          isFinalConsumer: true,
        },
      });

      expect(result.id).toBe('inv-existing');
      expect(result.invoiceNumber).toBe('FE-000088');
      expect(mockPrismaService.electronicInvoice.create).not.toHaveBeenCalled();
    });
  });
});
