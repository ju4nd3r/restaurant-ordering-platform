import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CustomerDocType,
  PaymentMethod,
  PaymentProviderType,
  SplitMode,
} from '@restaurant/types';

export class CustomerBillingDataDto {
  @IsOptional()
  isFinalConsumer?: boolean;

  @IsOptional()
  @IsEnum(['CC', 'NIT', 'CE', 'PASSPORT', 'FINAL_CONSUMER'])
  docType?: CustomerDocType;

  @IsOptional()
  @IsString()
  docNumber?: string;

  @IsOptional()
  @IsString()
  fullNameOrLegalName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  habeasDataAccepted?: boolean;
}

export class CreateOrderPaymentDto {
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;

  @IsOptional()
  @IsEnum(['WOMPI', 'CASH'])
  provider?: PaymentProviderType;

  @IsOptional()
  @IsEnum(['CARD', 'PSE', 'NEQUI', 'BANCOLOMBIA', 'CASH'])
  method?: PaymentMethod;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerBillingDataDto)
  customerBillingData?: CustomerBillingDataDto;
}

export class InitBillSplitDto {
  @IsUUID()
  @IsNotEmpty()
  tableSessionId!: string;

  @IsEnum(['BY_ITEMS', 'EQUAL_PARTS', 'CUSTOM_AMOUNT'])
  @IsNotEmpty()
  mode!: SplitMode;

  @IsOptional()
  @IsNumber()
  totalPersons?: number;
}

export class LockItemDto {
  @IsUUID()
  @IsNotEmpty()
  tableSessionId!: string;

  @IsUUID()
  @IsNotEmpty()
  orderItemId!: string;

  @IsString()
  @IsNotEmpty()
  participantId!: string;
}

export class PayBillSplitDto {
  @IsUUID()
  @IsNotEmpty()
  billSplitId!: string;

  @IsString()
  @IsNotEmpty()
  participantId!: string;

  @IsOptional()
  @IsEnum(['WOMPI', 'CASH'])
  provider?: PaymentProviderType;

  @IsOptional()
  @IsEnum(['CARD', 'PSE', 'NEQUI', 'BANCOLOMBIA', 'CASH'])
  method?: PaymentMethod;

  @IsOptional()
  selectedItemIds?: string[];

  @IsOptional()
  @IsNumber()
  customAmountCop?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerBillingDataDto)
  customerBillingData?: CustomerBillingDataDto;
}
