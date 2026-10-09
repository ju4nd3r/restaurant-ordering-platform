import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';

export class CreateModifierDto {
  @ApiProperty({ example: 'Queso campesino extra' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del adicional es requerido' })
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 4500, description: 'Precio del adicional en COP' })
  @IsInt({ message: 'El precio debe ser un número entero' })
  @Min(0)
  priceCop!: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class UpdateModifierDto {
  @ApiPropertyOptional({ example: 'Queso campesino extra' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 4500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCop?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
