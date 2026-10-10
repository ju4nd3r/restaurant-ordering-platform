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
}
