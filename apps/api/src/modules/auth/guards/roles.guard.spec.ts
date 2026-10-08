import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Role } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(roles: Role[] = []): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: '123',
            email: 'test@restaurante.com',
            roles,
          },
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access if no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockContext([Role.WAITER]);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should always allow ADMIN even if route requires KITCHEN', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.KITCHEN]);
    const context = createMockContext([Role.ADMIN]);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow user having the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.WAITER]);
    const context = createMockContext([Role.WAITER]);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user lacks required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.KITCHEN]);
    const context = createMockContext([Role.WAITER]);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
