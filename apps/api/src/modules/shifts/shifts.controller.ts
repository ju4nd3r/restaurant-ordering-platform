import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ShiftsService } from './shifts.service';
import { StartShiftDto, EndShiftDto } from './dto/shift.dto';

@ApiTags('Shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get('current')
  @Roles(Role.ADMIN, Role.KITCHEN, Role.WAITER, Role.CASHIER)
  @ApiOperation({ summary: 'Obtener información del turno activo del usuario y restaurante' })
  @ApiResponse({ status: 200, description: 'Estado del turno obtenido' })
  async getCurrentShift(
    @CurrentUser() user: { id: string; restaurantId: string },
  ) {
    return this.shiftsService.getCurrentShift(user.restaurantId, user.id);
  }

  @Post('start')
  @Roles(Role.ADMIN, Role.KITCHEN, Role.WAITER, Role.CASHIER)
  @ApiOperation({ summary: 'Registrar inicio de turno para el miembro del personal' })
  @ApiResponse({ status: 201, description: 'Turno iniciado' })
  async startShift(
    @CurrentUser() user: { id: string; restaurantId: string },
    @Body() dto: StartShiftDto,
  ) {
    return this.shiftsService.startShift(user.restaurantId, user.id, dto);
  }

  @Post('end')
  @Roles(Role.ADMIN, Role.KITCHEN, Role.WAITER, Role.CASHIER)
  @ApiOperation({ summary: 'Registrar fin de turno para el miembro del personal' })
  @ApiResponse({ status: 200, description: 'Turno finalizado' })
  async endShift(
    @CurrentUser() user: { id: string; restaurantId: string },
    @Body() dto: EndShiftDto,
  ) {
    return this.shiftsService.endShift(user.restaurantId, user.id, dto);
  }

  @Get('waiter/summary')
  @Roles(Role.WAITER, Role.ADMIN)
  @ApiOperation({ summary: 'Consultar mesas asignadas y propinas acumuladas del mesero' })
  @ApiResponse({ status: 200, description: 'Resumen del mesero' })
  async getWaiterSummary(
    @CurrentUser() user: { id: string; restaurantId: string },
  ) {
    return this.shiftsService.getWaiterShiftSummary(user.restaurantId, user.id);
  }
}
