import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TablesService } from './tables.service';
import { CreateTableDto, UpdateTableDto } from './dto/table.dto';

@ApiTags('Tables')
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  // ============================================================================
  // PUBLIC CLIENT: SCAN QR & RESOLVE TABLE SESSION
  // ============================================================================

  @Get('by-token/:qrToken')
  @ApiOperation({
    summary: 'Resolver mesa y abrir/obtener sesión activa mediante escaneo QR (Público)',
  })
  @ApiParam({ name: 'qrToken', description: 'Token opaco de alta entropía de la mesa' })
  @ApiResponse({ status: 200, description: 'Mesa, sesión y restaurante resueltos' })
  @ApiResponse({ status: 404, description: 'Mesa no encontrada o inactiva' })
  async resolveByToken(
    @Param('qrToken') qrToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.tablesService.resolveTableByQrToken(qrToken);

    // Set secure HttpOnly session cookie (ADR-0003)
    res.cookie('table_session_token', data.session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 6 * 60 * 60 * 1000, // 6 hours
      path: '/',
    });

    return data;
  }

  // ============================================================================
  // ADMIN: TABLES MANAGEMENT
  // ============================================================================

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar todas las mesas del restaurante (Admin)' })
  async getAllTables(@CurrentUser() user: { restaurantId: string }) {
    return this.tablesService.getAllTablesAdmin(user.restaurantId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obtener detalle de una mesa (Admin)' })
  async getTableById(@Param('id') id: string) {
    return this.tablesService.getTableById(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear nueva mesa física con token QR único (Admin)' })
  @ApiResponse({ status: 201, description: 'Mesa creada' })
  async createTable(
    @CurrentUser() user: { restaurantId: string },
    @Body() dto: CreateTableDto,
  ) {
    return this.tablesService.createTable(user.restaurantId, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar mesa (Admin)' })
  async updateTable(@Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.tablesService.updateTable(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar o desactivar mesa (Admin)' })
  async deleteTable(@Param('id') id: string) {
    return this.tablesService.deleteTable(id);
  }

  @Post(':id/close-session')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Cerrar manualmente la sesión activa de la mesa (Admin/Cajero)' })
  async closeSession(@Param('id') id: string) {
    return this.tablesService.closeActiveSession(id);
  }

  @Get(':id/qr')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Generar código QR descargable/imprimible de la mesa (Admin)' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['json', 'svg', 'png'],
    description: 'Formato del código QR generado',
  })
  async getTableQr(
    @Param('id') id: string,
    @Query('format') format: 'svg' | 'png' | 'json' = 'json',
    @Res() res: Response,
  ) {
    const result = await this.tablesService.generateTableQr(id, format);

    if (format === 'svg') {
      res.setHeader('Content-Type', (result as any).contentType);
      return res.send((result as any).data);
    }

    if (format === 'png') {
      res.setHeader('Content-Type', (result as any).contentType);
      return res.send((result as any).data);
    }

    return res.json(result);
  }
}
