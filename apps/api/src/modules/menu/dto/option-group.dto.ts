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
} from 'class-validator';

export class CreateOptionGroupDto {
  @ApiProperty({ example: 'Término de la carne' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del grupo es requerido' })
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: 1, description: 'Mínimo de opciones a seleccionar' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  minSelectable?: number;

  @ApiPropertyOptional({ example: 1, description: 'Máximo de opciones a seleccionar' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxSelectable?: number;
}

export class UpdateOptionGroupDto {
  @ApiPropertyOptional({ example: 'Término de la carne' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  minSelectable?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxSelectable?: number;
}

export class CreateOptionDto {
  @ApiProperty({ example: 'Tres cuartos (3/4)' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la opción es requerido' })
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: 0, description: 'Precio adicional en COP' })
  @IsOptional()
  @IsInt()
  @Min(0)
  additionalPriceCop?: number;

  @ApiPropertyOptional({ example: false, description: 'Opción predeterminada' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateOptionDto {
  @ApiPropertyOptional({ example: 'Tres cuartos (3/4)' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  additionalPriceCop?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
