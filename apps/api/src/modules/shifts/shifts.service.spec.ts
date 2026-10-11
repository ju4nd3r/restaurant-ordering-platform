import { Test, TestingModule } from '@nestjs/testing';
import { ShiftsService } from './shifts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ShiftsService', () => {
  let service: ShiftsService;
  let prisma: any;

  const mockRestaurantId = 'rest-123';
  const mockUserId = 'user-456';

  beforeEach(async () => {
    prisma = {
      shift: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      shiftStaff: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      restaurantTable: {
        findMany: jest.fn(),
      },
      tipAllocation: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ShiftsService>(ShiftsService);
  });

  describe('getCurrentShift', () => {
    it('returns empty when no active shift exists', async () => {
      prisma.shift.findFirst.mockResolvedValue(null);

      const res = await service.getCurrentShift(mockRestaurantId, mockUserId);
      expect(res.activeShift).toBeNull();
      expect(res.isUserCheckedIn).toBe(false);
    });

    it('returns checked in status when user is active in current shift', async () => {
      const checkInTime = new Date();
      prisma.shift.findFirst.mockResolvedValue({
        id: 'shift-1',
        restaurantId: mockRestaurantId,
        isOpen: true,
        staff: [
          {
            userId: mockUserId,
            checkIn: checkInTime,
            checkOut: null,
            user: { id: mockUserId, fullName: 'Carlos Mesero' },
          },
        ],
      });

      const res = await service.getCurrentShift(mockRestaurantId, mockUserId);
      expect(res.activeShift).toBeDefined();
      expect(res.isUserCheckedIn).toBe(true);
      expect(res.userCheckInTime).toEqual(checkInTime);
    });
  });

  describe('startShift', () => {
    it('starts new shift and adds staff member', async () => {
      prisma.shift.findFirst.mockResolvedValue(null);
      prisma.shift.create.mockResolvedValue({
        id: 'shift-new',
        restaurantId: mockRestaurantId,
        isOpen: true,
        staff: [],
      });
      prisma.shiftStaff.findUnique.mockResolvedValue(null);
      prisma.shiftStaff.create.mockResolvedValue({
        id: 'staff-rel-1',
        shiftId: 'shift-new',
        userId: mockUserId,
      });

      // Second findFirst for getCurrentShift
      prisma.shift.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'shift-new',
          isOpen: true,
          staff: [{ userId: mockUserId, checkIn: new Date(), checkOut: null }],
        });

      const result = await service.startShift(mockRestaurantId, mockUserId, { notes: 'Apertura' });
      expect(result.isUserCheckedIn).toBe(true);
    });

    it('throws BadRequestException if user already checked in', async () => {
      prisma.shift.findFirst.mockResolvedValue({
        id: 'shift-1',
        isOpen: true,
        staff: [],
      });
      prisma.shiftStaff.findUnique.mockResolvedValue({
        id: 'staff-rel-1',
        checkOut: null,
      });

      await expect(
        service.startShift(mockRestaurantId, mockUserId, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('endShift', () => {
    it('throws NotFoundException when no active shift is running', async () => {
      prisma.shift.findFirst.mockResolvedValue(null);

      await expect(
        service.endShift(mockRestaurantId, mockUserId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('ends staff shift registration successfully', async () => {
      prisma.shift.findFirst.mockResolvedValue({
        id: 'shift-1',
        isOpen: true,
        notes: null,
      });
      prisma.shiftStaff.findFirst.mockResolvedValue({
        id: 'staff-membership-1',
        shiftId: 'shift-1',
        userId: mockUserId,
        checkOut: null,
      });
      prisma.shiftStaff.update.mockResolvedValue({});

      const res = await service.endShift(mockRestaurantId, mockUserId, { notes: 'Cierre turno tarde' });
      expect(res.message).toContain('Turno finalizado');
      expect(prisma.shiftStaff.update).toHaveBeenCalled();
    });
  });

  describe('getWaiterShiftSummary', () => {
    it('returns waiter assigned tables and accumulated tips', async () => {
      prisma.restaurantTable.findMany.mockResolvedValue([
        { id: 't1', number: 1, label: 'Mesa 1' },
      ]);
      prisma.tipAllocation.findMany.mockResolvedValue([
        { id: 'tip-1', amountCop: 5000 },
        { id: 'tip-2', amountCop: 7000 },
      ]);

      const summary = await service.getWaiterShiftSummary(mockRestaurantId, mockUserId);
      expect(summary.assignedTablesCount).toBe(1);
      expect(summary.totalTipsCop).toBe(12000);
      expect(summary.tipAllocations.length).toBe(2);
    });
  });
});
