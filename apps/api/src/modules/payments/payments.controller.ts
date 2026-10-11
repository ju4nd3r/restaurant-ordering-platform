import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  CreateOrderPaymentDto,
  InitBillSplitDto,
  LockItemDto,
  PayBillSplitDto,
} from './dto/payment.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('order')
  async createOrderPayment(@Body() dto: CreateOrderPaymentDto) {
    return this.paymentsService.createOrderPayment(dto);
  }

  @Post('bill-split/init')
  async initBillSplit(@Body() dto: InitBillSplitDto) {
    return this.paymentsService.initBillSplit(dto);
  }

  @Get('bill-split/:tableSessionId')
  async getBillSplit(@Param('tableSessionId') tableSessionId: string) {
    return this.paymentsService.getBillSplit(tableSessionId);
  }

  @Post('bill-split/lock-item')
  async lockItem(@Body() dto: LockItemDto) {
    return this.paymentsService.lockItem(
      dto.tableSessionId,
      dto.orderItemId,
      dto.participantId,
    );
  }

  @Post('bill-split/unlock-item')
  async unlockItem(@Body() dto: LockItemDto) {
    return this.paymentsService.unlockItem(
      dto.tableSessionId,
      dto.orderItemId,
      dto.participantId,
    );
  }

  @Post('bill-split/pay')
  async payBillSplit(@Body() dto: PayBillSplitDto) {
    return this.paymentsService.payBillSplit(dto);
  }

  @Post('wompi/webhook')
  @HttpCode(HttpStatus.OK)
  async handleWompiWebhook(@Body() payload: Record<string, any>) {
    return this.paymentsService.processWompiWebhook(payload);
  }

  @Get(':id/verify')
  async verifyPayment(@Param('id') id: string) {
    return this.paymentsService.verifyPayment(id);
  }

  @Post(':id/confirm-cash')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER', 'ADMIN')
  async confirmCashPayment(@Param('id') id: string) {
    return this.paymentsService.confirmCashPayment(id);
  }
}
