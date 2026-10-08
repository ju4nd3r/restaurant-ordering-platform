import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Verifica la disponibilidad del servicio API' })
  check() {
    return {
      status: 'ok',
      service: 'restaurant-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
    };
  }
}
