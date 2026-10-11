import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StartShiftDto {
  @ApiPropertyOptional({ description: 'Notas u observaciones del inicio de turno' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  notes?: string;
}

export class EndShiftDto {
  @ApiPropertyOptional({ description: 'Notas u observaciones del cierre de turno' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  notes?: string;
}
