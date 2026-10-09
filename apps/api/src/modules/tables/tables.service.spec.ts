import { Test, TestingModule } from '@nestjs/testing';
import { TablesService } from './tables.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { TableSessionStatus } from '@prisma/client';

describe('TablesService', () => {
  let service: TablesService;
  let prisma: {
    restaurantTable: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    restaurant: {
      findFirst: jest.Mock;
    };
    user: {
      findFirst: jest.Mock;
    };
    tableSession: {
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  const mockRestaurant = {
    id: 'rest-123',
    name: 'Sabor Criollo',
    slug: 'sabor-criollo',
    address: 'Calle 85',
    phone: '3101234567',
    taxType: 'INC_8',
    taxPercentage: 8,
    defaultTipPercentage: 10,
    currency: 'COP',
    isActive: true,
  };

  const mockTable = {
    id: 'table-123',
    restaurantId: 'rest-123',
    number: 1,
    label: 'Mesa 1',
    zone: 'Terraza',
    qrToken: 'm_tbl1_abc123',
    isActive: true,
    restaurant: mockRestaurant,
    assignedWaiter: { id: 'waiter-1', fullName: 'Carlos Mesero' },
    sessions: [],
    _count: { orders: 0 },
  };

  beforeEach(async () => {
    prisma = {
      restaurantTable: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      restaurant: {
        findFirst: jest.fn().mockResolvedValue(mockRestaurant),
      },
      user: {
        findFirst: jest.fn(),
      },
      tableSession: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TablesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<TablesService>(TablesService);
  });

  describe('resolveTableByQrToken', () => {
    it('throws NotFoundException if table is not found or inactive', async () => {
      prisma.restaurantTable.findUnique.mockResolvedValue(null);
      await expect(service.resolveTableByQrToken('invalid_token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('creates a new table session if no active session exists', async () => {
      prisma.restaurantTable.findUnique.mockResolvedValue({
        ...mockTable,
        sessions: [],
      });
      const newSession = {
        id: 'sess-new',
        sessionToken: 'sess_token_123',
        status: TableSessionStatus.ACTIVE,
        openedAt: new Date(),
      };
      prisma.tableSession.create.mockResolvedValue(newSession);

      const result = await service.resolveTableByQrToken('m_tbl1_abc123');

      expect(result.table.number).toBe(1);
      expect(result.session.id).toBe('sess-new');
      expect(prisma.tableSession.create).toHaveBeenCalled();
    });

    it('reuses existing active session if within 6 hours', async () => {
      const recentSession = {
        id: 'sess-existing',
        sessionToken: 'sess_existing_token',
        status: TableSessionStatus.ACTIVE,
        openedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
      };
      prisma.restaurantTable.findUnique.mockResolvedValue({
        ...mockTable,
        sessions: [recentSession],
      });

      const result = await service.resolveTableByQrToken('m_tbl1_abc123');

      expect(result.session.id).toBe('sess-existing');
      expect(prisma.tableSession.create).not.toHaveBeenCalled();
    });

    it('closes expired session (> 6 hours) and creates a new one (ADR-0003)', async () => {
      const staleSession = {
        id: 'sess-stale',
        sessionToken: 'sess_stale_token',
        status: TableSessionStatus.ACTIVE,
        openedAt: new Date(Date.now() - 7 * 60 * 60 * 1000), // 7 hours ago
      };
      prisma.restaurantTable.findUnique.mockResolvedValue({
        ...mockTable,
        sessions: [staleSession],
      });
      prisma.tableSession.update.mockResolvedValue({
        ...staleSession,
        status: TableSessionStatus.CLOSED,
      });
      const freshSession = {
        id: 'sess-fresh',
        sessionToken: 'sess_fresh_token',
        status: TableSessionStatus.ACTIVE,
        openedAt: new Date(),
      };
      prisma.tableSession.create.mockResolvedValue(freshSession);

      const result = await service.resolveTableByQrToken('m_tbl1_abc123');

      expect(prisma.tableSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sess-stale' },
          data: expect.objectContaining({ status: TableSessionStatus.CLOSED }),
        }),
      );
      expect(prisma.tableSession.create).toHaveBeenCalled();
      expect(result.session.id).toBe('sess-fresh');
    });
  });

  describe('createTable', () => {
    it('throws ConflictException if table number already exists in restaurant', async () => {
      prisma.restaurantTable.findUnique.mockResolvedValue(mockTable);
      await expect(
        service.createTable('rest-123', { number: 1, label: 'Mesa 1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates table with generated high-entropy qrToken', async () => {
      prisma.restaurantTable.findUnique.mockResolvedValue(null);
      prisma.restaurantTable.create.mockImplementation((args: any) => ({
        ...mockTable,
        ...args.data,
      }));

      const created = await service.createTable('rest-123', {
        number: 10,
        label: 'Mesa 10',
        zone: 'VIP',
      });

      expect(created.number).toBe(10);
      expect(prisma.restaurantTable.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            number: 10,
            qrToken: expect.stringMatching(/^m_tbl10_[a-f0-9]+$/),
          }),
        }),
      );
    });
  });

  describe('deleteTable', () => {
    it('soft deactivates table if it has past orders history', async () => {
      prisma.restaurantTable.findUnique.mockResolvedValue({
        ...mockTable,
        _count: { orders: 5 },
      });
      prisma.restaurantTable.update.mockResolvedValue({ ...mockTable, isActive: false });

      await service.deleteTable('table-123');

      expect(prisma.restaurantTable.update).toHaveBeenCalledWith({
        where: { id: 'table-123' },
        data: { isActive: false },
      });
      expect(prisma.restaurantTable.delete).not.toHaveBeenCalled();
    });

    it('hard deletes table if it has 0 orders', async () => {
      prisma.restaurantTable.findUnique.mockResolvedValue({
        ...mockTable,
        _count: { orders: 0 },
      });
      prisma.restaurantTable.delete.mockResolvedValue(mockTable);

      await service.deleteTable('table-123');

      expect(prisma.restaurantTable.delete).toHaveBeenCalledWith({
        where: { id: 'table-123' },
      });
    });
  });

  describe('generateTableQr', () => {
    it('generates QR code in SVG and JSON formats', async () => {
      prisma.restaurantTable.findUnique.mockResolvedValue({
        ...mockTable,
        restaurant: mockRestaurant,
      });

      const jsonResult = await service.generateTableQr('table-123', 'json');
      expect((jsonResult as any).targetUrl).toContain('/m/m_tbl1_abc123');
      expect((jsonResult as any).dataUrl).toContain('data:image/png;base64');

      const svgResult = await service.generateTableQr('table-123', 'svg');
      expect((svgResult as any).contentType).toBe('image/svg+xml');
      expect((svgResult as any).data).toContain('<svg');
    });
  });
});
