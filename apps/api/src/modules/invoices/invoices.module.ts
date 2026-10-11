import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { FakeInvoiceProvider } from './providers/fake-invoice.provider';
import { MailService } from './mail.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, FakeInvoiceProvider, MailService],
  exports: [InvoicesService, FakeInvoiceProvider],
})
export class InvoicesModule {}
