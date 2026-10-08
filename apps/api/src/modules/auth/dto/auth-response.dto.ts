import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserProfileDto {
  @ApiProperty({ example: 'b149b140-54b0-4dbf-859a-115f573ef890' })
  id!: string;

  @ApiProperty({ example: 'rest_uuid_1234' })
  restaurantId!: string;

  @ApiProperty({ example: 'admin@restaurante.com' })
  email!: string;

  @ApiProperty({ example: 'Alejandro Morales (Admin)' })
  fullName!: string;

  @ApiProperty({ enum: Role, isArray: true, example: ['ADMIN'] })
  roles!: Role[];
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ type: UserProfileDto })
  user!: UserProfileDto;
}
