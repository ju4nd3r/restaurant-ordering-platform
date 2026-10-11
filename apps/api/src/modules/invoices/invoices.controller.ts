import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { RequestElectronicInvoiceDto, QueryInvoicesDto } from './dto/invoice.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('request')
  async requestInvoice(@Body() dto: RequestElectronicInvoiceDto) {
    return this.invoicesService.requestInvoice(dto);
  }

  @Get('by-order/:orderId')
  async getInvoiceByOrderId(@Param('orderId') orderId: string) {
    return this.invoicesService.getInvoiceByOrderId(orderId);
  }

  @Get(':id')
  async getInvoiceById(@Param('id') id: string) {
    return this.invoicesService.getInvoiceById(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER', 'ADMIN')
  async listInvoices(@Query() query: QueryInvoicesDto) {
    return this.invoicesService.listInvoices(query);
  }
}
