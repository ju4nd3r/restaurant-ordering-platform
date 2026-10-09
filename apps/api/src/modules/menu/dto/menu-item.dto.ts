import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  IsBoolean,
  IsUUID,
  IsArray,
  IsEnum,
  Min,
} from 'class-validator';
import { Allergen, DietaryFlag } from '@prisma/client';

export class CreateMenuItemDto {
  @ApiProperty({ description: 'ID de la categoría a la que pertenece' })
  @IsUUID('4', { message: 'El ID de la categoría debe ser un UUID válido' })
  @IsNotEmpty({ message: 'La categoría es requerida' })
  categoryId!: string;

  @ApiProperty({ example: 'Bandeja Paisa Tradicional' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(120, { message: 'El nombre no puede exceder 120 caracteres' })
  name!: string;

  @ApiProperty({
    example: 'Arroz, frijoles antioqueños, carne molida, chicharrón crujiente, huevo frito, tajada de plátano, arepa y aguacate.',
  })
  @IsString()
  @IsNotEmpty({ message: 'La descripción es requerida' })
  @MinLength(2, { message: 'La descripción debe tener al menos 2 caracteres' })
  @MaxLength(1000, { message: 'La descripción no puede exceder 1000 caracteres' })
  description!: string;

  @ApiProperty({ example: 38000, description: 'Precio base en COP (entero sin decimales)' })
  @IsInt({ message: 'El precio debe ser un número entero en COP' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  basePriceCop!: number;

  @ApiPropertyOptional({ example: 20, description: 'Tiempo estimado de preparación en minutos' })
  @IsOptional()
  @IsInt()
  @Min(1)
  prepTimeMinutes?: number;

  @ApiPropertyOptional({ example: true, description: 'Disponibilidad del plato' })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    example: ['frijoles', 'arroz', 'chicharrón', 'carne molida', 'huevo', 'aguacate'],
    description: 'Lista de ingredientes principales',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[];

  @ApiPropertyOptional({
    enum: Allergen,
    isArray: true,
    example: ['EGGS'],
    description: 'Alérgenos alimentarios',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Allergen, { each: true })
  allergens?: Allergen[];

  @ApiPropertyOptional({
    enum: DietaryFlag,
    isArray: true,
    example: [],
    description: 'Etiquetas dietéticas',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(DietaryFlag, { each: true })
  dietaryFlags?: DietaryFlag[];

  @ApiPropertyOptional({ example: 0, description: 'Orden de clasificación' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateMenuItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  basePriceCop?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  prepTimeMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[];

  @ApiPropertyOptional({ enum: Allergen, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Allergen, { each: true })
  allergens?: Allergen[];

  @ApiPropertyOptional({ enum: DietaryFlag, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(DietaryFlag, { each: true })
  dietaryFlags?: DietaryFlag[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class ToggleAvailabilityDto {
  @ApiProperty({ example: true, description: 'Nuevo estado de disponibilidad' })
  @IsBoolean({ message: 'El campo isAvailable debe ser booleano' })
  isAvailable!: boolean;
}
