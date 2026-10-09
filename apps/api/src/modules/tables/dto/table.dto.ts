import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export class CreateTableDto {
  @ApiProperty({ example: 1, description: 'Número físico de la mesa' })
  @IsInt({ message: 'El número de mesa debe ser un entero' })
  @Min(1, { message: 'El número de mesa debe ser al menos 1' })
  @Max(999, { message: 'El número de mesa no puede exceder 999' })
  number!: number;

  @ApiProperty({ example: 'Mesa 1 (Terraza)', description: 'Etiqueta descriptiva de la mesa' })
  @IsString()
  @IsNotEmpty({ message: 'La etiqueta es requerida' })
  @MinLength(1)
  @MaxLength(50)
  label!: string;

  @ApiPropertyOptional({ example: 'Terraza', description: 'Zona del restaurante' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  zone?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID del mesero asignado (opcional)',
  })
  @IsOptional()
  @IsUUID('4')
  assignedWaiterId?: string | null;

  @ApiPropertyOptional({ example: true, description: 'Estado activo de la mesa' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTableDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  number?: number;

  @ApiPropertyOptional({ example: 'Mesa 1 (Terraza)' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  label?: string;

  @ApiPropertyOptional({ example: 'Terraza' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  zone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  assignedWaiterId?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
