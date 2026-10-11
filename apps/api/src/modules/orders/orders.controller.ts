import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ============================================================================
  // CLIENT: CREATE & TRACK ORDERS
  // ============================================================================

  @Post()
  @ApiOperation({
    summary: 'Crear nuevo pedido desde la sesión de mesa (cálculo estricto en backend)',
  })
  @ApiResponse({ status: 201, description: 'Pedido creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos del pedido o sesión inválidos' })
  async createOrder(@Body() dto: CreateOrderDto, @Req() req: Request) {
    const cookieToken = req.cookies?.['table_session_token'];
    return this.ordersService.createOrder(dto, cookieToken);
  }

  @Get('session/:tableSessionId')
  @ApiOperation({
    summary: 'Obtener todos los pedidos de la sesión activa de mesa (seguimiento comensal)',
  })
  @ApiParam({ name: 'tableSessionId', description: 'ID de la sesión de mesa' })
  async getOrdersBySession(@Param('tableSessionId') tableSessionId: string) {
    return this.ordersService.getOrdersBySession(tableSessionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle completo de un pedido' })
  @ApiParam({ name: 'id', description: 'ID del pedido' })
  async getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  // ============================================================================
  // STAFF: KITCHEN DISPLAY SYSTEM (KDS) & WAITER
  // ============================================================================

  @Get('kitchen/active')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KITCHEN, Role.ADMIN)
  @ApiOperation({
    summary: 'Listar pedidos activos en orden de llegada (FIFO) para la cocina / KDS',
  })
  async getActiveKitchenOrders(@CurrentUser() user: { restaurantId: string }) {
    return this.ordersService.getActiveOrdersForKitchen(user.restaurantId);
  }

  @Get('waiter/ready')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WAITER, Role.ADMIN)
  @ApiOperation({
    summary: 'Listar pedidos en estado LISTO asignados al mesero o generales del restaurante',
  })
  async getReadyOrders(
    @CurrentUser() user: { id: string; restaurantId: string },
  ) {
    return this.ordersService.getReadyOrdersForWaiter(user.restaurantId, user.id);
  }

  @Get('cashier/pending-cash')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CASHIER, Role.ADMIN)
  @ApiOperation({
    summary: 'Listar pedidos con pagos pendientes en efectivo para confirmación en caja',
  })
  async getPendingCashOrders(
    @CurrentUser() user: { restaurantId: string },
  ) {
    return this.ordersService.getCashPendingOrdersForCashier(user.restaurantId);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KITCHEN, Role.WAITER, Role.ADMIN)
  @ApiOperation({
    summary: 'Avanzar estado del pedido (Recibido → En preparación → Listo → Entregado)',
  })
  @ApiParam({ name: 'id', description: 'ID del pedido' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.ordersService.updateOrderStatus(id, dto.status, user?.id);
  }

  // ============================================================================
  // ADMIN: HISTORY & METRICS
  // ============================================================================

  @Get('admin/history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Consultar historial de pedidos con filtros (Admin)' })
  async getOrdersAdmin(
    @CurrentUser() user: { restaurantId: string },
    @Req() req: Request,
  ) {
    const query = req.query as any;
    return this.ordersService.getOrdersAdmin(user.restaurantId, {
      status: query.status,
      tableId: query.tableId,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
    });
  }

  @Get('admin/daily-sales')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Consultar resumen y métricas de ventas del día (Admin)' })
  async getDailySales(
    @CurrentUser() user: { restaurantId: string },
    @Req() req: Request,
  ) {
    const dateStr = (req.query as any)?.date;
    return this.ordersService.getDailySalesSummary(user.restaurantId, dateStr);
  }
}
