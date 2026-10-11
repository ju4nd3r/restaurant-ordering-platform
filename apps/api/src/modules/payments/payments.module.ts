import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WompiPaymentProvider } from './providers/wompi.provider';
import { CashPaymentProvider } from './providers/cash.provider';
import { BillSplitLockService } from './bill-split-lock.service';

@Module({
  imports: [PrismaModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    WompiPaymentProvider,
    CashPaymentProvider,
    BillSplitLockService,
  ],
  exports: [
    PaymentsService,
    WompiPaymentProvider,
    CashPaymentProvider,
    BillSplitLockService,
  ],
})
export class PaymentsModule {}
