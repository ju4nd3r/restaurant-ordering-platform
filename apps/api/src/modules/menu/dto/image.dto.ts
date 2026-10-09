import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class ReorderImagesDto {
  @ApiProperty({
    example: ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001'],
    description: 'Array ordenado de IDs de imágenes pertenecientes al plato',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe enviar al menos un ID de imagen' })
  @IsUUID('4', { each: true, message: 'Cada elemento debe ser un UUID válido' })
  imageIds!: string[];
}
