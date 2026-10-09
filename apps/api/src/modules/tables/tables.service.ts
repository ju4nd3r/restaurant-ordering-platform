import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TableSessionStatus } from '@prisma/client';
import * as crypto from 'crypto';
import QRCode from 'qrcode';
import { CreateTableDto, UpdateTableDto } from './dto/table.dto';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // PUBLIC CLIENT: RESOLVE TABLE & MANAGE TABLE SESSION LIFECYCLE (ADR-0003)
  // ============================================================================

  async resolveTableByQrToken(qrToken: string) {
    const table = await this.prisma.restaurantTable.findUnique({
      where: { qrToken },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            phone: true,
            taxType: true,
            taxPercentage: true,
            defaultTipPercentage: true,
            currency: true,
            isActive: true,
          },
        },
        assignedWaiter: {
          select: {
            id: true,
            fullName: true,
          },
        },
        sessions: {
          where: { status: TableSessionStatus.ACTIVE },
          orderBy: { openedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!table || !table.isActive || !table.restaurant.isActive) {
      throw new NotFoundException('Mesa no encontrada o actualmente inactiva');
    }

    let activeSession = table.sessions[0];
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    // If active session is older than 6 hours, close it and start a new one (ADR-0003)
    if (activeSession && activeSession.openedAt < sixHoursAgo) {
      await this.prisma.tableSession.update({
        where: { id: activeSession.id },
        data: {
          status: TableSessionStatus.CLOSED,
          closedAt: new Date(),
        },
      });
      activeSession = undefined as any;
    }

    if (!activeSession) {
      const sessionToken = `sess_${crypto.randomBytes(24).toString('hex')}`;
      activeSession = await this.prisma.tableSession.create({
        data: {
          tableId: table.id,
          sessionToken,
          status: TableSessionStatus.ACTIVE,
        },
      });
    }

    return {
      table: {
        id: table.id,
        number: table.number,
        label: table.label,
        zone: table.zone,
        assignedWaiter: table.assignedWaiter,
      },
      session: {
        id: activeSession.id,
        sessionToken: activeSession.sessionToken,
        status: activeSession.status,
        openedAt: activeSession.openedAt,
      },
      restaurant: table.restaurant,
    };
  }

  // ============================================================================
  // ADMIN: TABLES MANAGEMENT
  // ============================================================================

  async getAllTablesAdmin(restaurantId?: string) {
    const targetRestaurantId = restaurantId || (await this.getDefaultRestaurantId());

    return this.prisma.restaurantTable.findMany({
      where: { restaurantId: targetRestaurantId },
      orderBy: { number: 'asc' },
      include: {
        assignedWaiter: {
          select: { id: true, fullName: true, email: true },
        },
        sessions: {
          where: { status: TableSessionStatus.ACTIVE },
          select: { id: true, openedAt: true, sessionToken: true },
          take: 1,
        },
        _count: {
          select: { orders: true },
        },
      },
    });
  }

  async getTableById(id: string) {
    const table = await this.prisma.restaurantTable.findUnique({
      where: { id },
      include: {
        assignedWaiter: {
          select: { id: true, fullName: true },
        },
      },
    });
    if (!table) {
      throw new NotFoundException(`Mesa con ID "${id}" no encontrada`);
    }
    return table;
  }

  async createTable(restaurantId: string, dto: CreateTableDto) {
    // Check if table number already exists in restaurant
    const existing = await this.prisma.restaurantTable.findUnique({
      where: {
        restaurantId_number: {
          restaurantId,
          number: dto.number,
        },
      },
    });
    if (existing) {
      throw new ConflictException(`Ya existe la mesa número ${dto.number} en este restaurante`);
    }

    if (dto.assignedWaiterId) {
      const waiter = await this.prisma.user.findFirst({
        where: { id: dto.assignedWaiterId, restaurantId },
      });
      if (!waiter) {
        throw new BadRequestException('El mesero asignado no pertenece a este restaurante');
      }
    }

    const qrToken = `m_tbl${dto.number}_${crypto.randomBytes(10).toString('hex')}`;

    return this.prisma.restaurantTable.create({
      data: {
        restaurantId,
        number: dto.number,
        label: dto.label.trim(),
        zone: dto.zone ? dto.zone.trim() : undefined,
        qrToken,
        assignedWaiterId: dto.assignedWaiterId,
        isActive: dto.isActive ?? true,
      },
      include: {
        assignedWaiter: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  async updateTable(id: string, dto: UpdateTableDto) {
    const table = await this.prisma.restaurantTable.findUnique({ where: { id } });
    if (!table) {
      throw new NotFoundException(`Mesa con ID "${id}" no encontrada`);
    }

    if (dto.number !== undefined && dto.number !== table.number) {
      const existing = await this.prisma.restaurantTable.findUnique({
        where: {
          restaurantId_number: {
            restaurantId: table.restaurantId,
            number: dto.number,
          },
        },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Ya existe una mesa con el número ${dto.number}`);
      }
    }

    if (dto.assignedWaiterId) {
      const waiter = await this.prisma.user.findFirst({
        where: { id: dto.assignedWaiterId, restaurantId: table.restaurantId },
      });
      if (!waiter) {
        throw new BadRequestException('El mesero asignado no pertenece a este restaurante');
      }
    }

    return this.prisma.restaurantTable.update({
      where: { id },
      data: {
        number: dto.number,
        label: dto.label ? dto.label.trim() : undefined,
        zone: dto.zone !== undefined ? (dto.zone ? dto.zone.trim() : null) : undefined,
        assignedWaiterId: dto.assignedWaiterId,
        isActive: dto.isActive,
      },
      include: {
        assignedWaiter: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  async deleteTable(id: string) {
    const table = await this.prisma.restaurantTable.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });
    if (!table) {
      throw new NotFoundException(`Mesa con ID "${id}" no encontrada`);
    }

    if (table._count.orders > 0) {
      // Deactivate instead of hard deleting to preserve historical accounting & orders
      return this.prisma.restaurantTable.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.restaurantTable.delete({ where: { id } });
  }

  async closeActiveSession(tableId: string) {
    const table = await this.prisma.restaurantTable.findUnique({ where: { id: tableId } });
    if (!table) {
      throw new NotFoundException(`Mesa con ID "${tableId}" no encontrada`);
    }

    const updated = await this.prisma.tableSession.updateMany({
      where: {
        tableId,
        status: TableSessionStatus.ACTIVE,
      },
      data: {
        status: TableSessionStatus.CLOSED,
        closedAt: new Date(),
      },
    });

    return {
      message: `Sesión de la mesa ${table.number} cerrada exitosamente`,
      closedCount: updated.count,
    };
  }

  // ============================================================================
  // QR CODE GENERATION & PRINTABLE ASSETS
  // ============================================================================

  async generateTableQr(tableId: string, format: 'svg' | 'png' | 'json' = 'json') {
    const table = await this.prisma.restaurantTable.findUnique({
      where: { id: tableId },
      include: { restaurant: true },
    });
    if (!table) {
      throw new NotFoundException(`Mesa con ID "${tableId}" no encontrada`);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const targetUrl = `${frontendUrl}/m/${table.qrToken}`;

    if (format === 'svg') {
      const svg = await QRCode.toString(targetUrl, {
        type: 'svg',
        margin: 2,
        color: {
          dark: '#1e293b',
          light: '#ffffff',
        },
      });
      return { contentType: 'image/svg+xml', data: svg };
    }

    if (format === 'png') {
      const buffer = await QRCode.toBuffer(targetUrl, {
        type: 'png',
        margin: 2,
        width: 600,
        color: {
          dark: '#1e293b',
          light: '#ffffff',
        },
      });
      return { contentType: 'image/png', data: buffer };
    }

    // Default: json with dataURL
    const dataUrl = await QRCode.toDataURL(targetUrl, {
      margin: 2,
      width: 400,
    });

    return {
      tableId: table.id,
      tableNumber: table.number,
      label: table.label,
      zone: table.zone,
      restaurantName: table.restaurant.name,
      qrToken: table.qrToken,
      targetUrl,
      dataUrl,
    };
  }

  private async getDefaultRestaurantId(): Promise<string> {
    const rest = await this.prisma.restaurant.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!rest) {
      throw new NotFoundException('No se encontró ningún restaurante activo configurado');
    }
    return rest.id;
  }
}
