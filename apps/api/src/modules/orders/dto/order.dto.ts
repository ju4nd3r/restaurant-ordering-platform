import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

export class OptionSelectionDto {
  @ApiProperty({ description: 'ID del grupo de opciones' })
  @IsUUID('4')
  optionGroupId!: string;

  @ApiProperty({ description: 'Nombre del grupo de opciones' })
  @IsString()
  @IsNotEmpty()
  optionGroupName!: string;

  @ApiProperty({ description: 'ID de la opción seleccionada' })
  @IsUUID('4')
  optionId!: string;

  @ApiProperty({ description: 'Nombre de la opción seleccionada' })
  @IsString()
  @IsNotEmpty()
  optionName!: string;

  @ApiPropertyOptional({ default: 0, description: 'Precio adicional en COP' })
  @IsOptional()
  @IsInt()
  @Min(0)
  additionalPriceCop?: number;
}

export class ModifierSelectionDto {
  @ApiProperty({ description: 'ID del adicional / extra' })
  @IsUUID('4')
  modifierId!: string;

  @ApiProperty({ description: 'Nombre del adicional' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ default: 0, description: 'Precio del adicional en COP' })
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCop?: number;
}

export class CreateOrderItemDto {
  @ApiProperty({ description: 'ID del plato en el menú' })
  @IsUUID('4')
  menuItemId!: string;

  @ApiProperty({ example: 1, description: 'Cantidad solicitada' })
  @IsInt()
  @Min(1)
  @Max(50)
  quantity!: number;

  @ApiPropertyOptional({
    example: 'Sin cebolla',
    description: 'Comentario libre del comensal para la cocina',
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ type: [OptionSelectionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionSelectionDto)
  selectedOptions?: OptionSelectionDto[];

  @ApiPropertyOptional({ type: [ModifierSelectionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModifierSelectionDto)
  selectedModifiers?: ModifierSelectionDto[];
}

export class CreateOrderDto {
  @ApiPropertyOptional({
    description: 'Token de la sesión de mesa (opcional si se envía en cookie table_session_token)',
  })
  @IsOptional()
  @IsString()
  tableSessionToken?: string;

  @ApiProperty({ type: [CreateOrderItemDto], description: 'Platos ordenados' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiPropertyOptional({
    example: 'Por favor servir todo al tiempo',
    description: 'Instrucciones generales del pedido',
  })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    description: 'Porcentaje de propina voluntaria (0% a 30%)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  tipPercentage?: number = 10;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.IN_PREPARATION })
  @IsEnum(OrderStatus, { message: 'Estado de pedido inválido' })
  status!: OrderStatus;
}
