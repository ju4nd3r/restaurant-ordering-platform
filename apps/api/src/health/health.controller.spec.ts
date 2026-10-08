import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    healthController = app.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('should return status ok and service name', () => {
      const result = healthController.check();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('restaurant-api');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.uptimeSeconds).toBe('number');
    });
  });
});
