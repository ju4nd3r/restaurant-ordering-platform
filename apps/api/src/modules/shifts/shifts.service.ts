import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StartShiftDto, EndShiftDto } from './dto/shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentShift(restaurantId: string, userId: string) {
    // Find active shift in the restaurant
    const activeShift = await this.prisma.shift.findFirst({
      where: {
        restaurantId,
        isOpen: true,
      },
      include: {
        staff: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                roles: true,
              },
            },
          },
        },
      },
    });

    const userMembership = activeShift?.staff.find(
      (s) => s.userId === userId && !s.checkOut,
    );

    return {
      activeShift,
      isUserCheckedIn: Boolean(userMembership),
      userCheckInTime: userMembership?.checkIn || null,
    };
  }

  async startShift(restaurantId: string, userId: string, dto: StartShiftDto) {
    let activeShift = await this.prisma.shift.findFirst({
      where: {
        restaurantId,
        isOpen: true,
      },
      include: { staff: true },
    });

    if (!activeShift) {
      activeShift = await this.prisma.shift.create({
        data: {
          restaurantId,
          notes: dto.notes,
          isOpen: true,
        },
        include: { staff: true },
      });
    }

    const existingMembership = await this.prisma.shiftStaff.findUnique({
      where: {
        shiftId_userId: {
          shiftId: activeShift.id,
          userId,
        },
      },
    });

    if (existingMembership && !existingMembership.checkOut) {
      throw new BadRequestException('El usuario ya tiene un turno activo en curso');
    }

    if (existingMembership && existingMembership.checkOut) {
      await this.prisma.shiftStaff.update({
        where: { id: existingMembership.id },
        data: {
          checkIn: new Date(),
          checkOut: null,
        },
      });
    } else {
      await this.prisma.shiftStaff.create({
        data: {
          shiftId: activeShift.id,
          userId,
          checkIn: new Date(),
        },
      });
    }

    return this.getCurrentShift(restaurantId, userId);
  }

  async endShift(restaurantId: string, userId: string, dto: EndShiftDto) {
    const activeShift = await this.prisma.shift.findFirst({
      where: {
        restaurantId,
        isOpen: true,
      },
      include: { staff: true },
    });

    if (!activeShift) {
      throw new NotFoundException('No hay ningún turno general activo en el restaurante');
    }

    const membership = await this.prisma.shiftStaff.findFirst({
      where: {
        shiftId: activeShift.id,
        userId,
        checkOut: null,
      },
    });

    if (!membership) {
      throw new BadRequestException('El usuario no tiene un registro de turno activo');
    }

    await this.prisma.shiftStaff.update({
      where: { id: membership.id },
      data: {
        checkOut: new Date(),
      },
    });

    if (dto.notes) {
      await this.prisma.shift.update({
        where: { id: activeShift.id },
        data: {
          notes: activeShift.notes
            ? `${activeShift.notes} | Cierre (${userId}): ${dto.notes}`
            : `Cierre: ${dto.notes}`,
        },
      });
    }

    return {
      message: 'Turno finalizado exitosamente',
      checkOut: new Date(),
    };
  }

  async getWaiterShiftSummary(restaurantId: string, waiterId: string) {
    // Calculate tips and assigned orders for the waiter
    const assignedTables = await this.prisma.restaurantTable.findMany({
      where: {
        restaurantId,
        assignedWaiterId: waiterId,
        isActive: true,
      },
      include: {
        sessions: {
          where: { status: 'ACTIVE' },
          include: {
            orders: {
              where: {
                status: {
                  in: ['RECEIVED', 'IN_PREPARATION', 'READY', 'DELIVERED'],
                },
              },
            },
          },
        },
      },
    });

    const tipAllocations = await this.prisma.tipAllocation.findMany({
      where: {
        userId: waiterId,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const totalTipsCop = tipAllocations.reduce((sum, tip) => sum + tip.amountCop, 0);

    return {
      waiterId,
      assignedTablesCount: assignedTables.length,
      assignedTables,
      totalTipsCop,
      tipAllocations,
    };
  }
}
