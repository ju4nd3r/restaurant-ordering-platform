import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryMenuItemsDto {
  @ApiPropertyOptional({ description: 'ID del restaurante (opcional)' })
  @IsOptional()
  @IsUUID('4')
  restaurantId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por categoría' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Búsqueda de texto en nombre, descripción e ingredientes',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Filtro de banderas dietéticas separadas por coma (ej. VEGETARIAN,GLUTEN_FREE)',
  })
  @IsOptional()
  @IsString()
  dietaryFlags?: string;

  @ApiPropertyOptional({
    description: 'Filtrar solo disponibles (por defecto true en público)',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
  @IsBoolean()
  onlyAvailable?: boolean = true;
}
