import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerBillingDataDto } from '../../payments/dto/payment.dto';
import { InvoiceStatus } from '@prisma/client';

export class RequestElectronicInvoiceDto {
  @IsUUID('4')
  @IsNotEmpty()
  orderId!: string;

  @IsOptional()
  @IsUUID('4')
  transactionId?: string;

  @ValidateNested()
  @Type(() => CustomerBillingDataDto)
  @IsNotEmpty()
  billingData!: CustomerBillingDataDto;
}

export class QueryInvoicesDto {
  @IsOptional()
  @IsUUID('4')
  restaurantId?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
