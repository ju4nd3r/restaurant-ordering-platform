import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-123',
    restaurantId: 'rest-456',
    email: 'admin@restaurante.com',
    passwordHash: '',
    fullName: 'Alejandro Morales',
    isActive: true,
    roles: [{ role: Role.ADMIN }],
  };

  beforeAll(async () => {
    mockUser.passwordHash = await argon2.hash('ValidPassword123!');
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn().mockImplementation(({ where }) => {
                if (where.email === 'admin@restaurante.com' || where.id === 'user-123') {
                  return Promise.resolve(mockUser);
                }
                return Promise.resolve(null);
              }),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mocked_jwt_token'),
            verifyAsync: jest
              .fn()
              .mockResolvedValue({ sub: 'user-123', email: 'admin@restaurante.com' }),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should validate user with correct password', async () => {
    const user = await authService.validateUser('admin@restaurante.com', 'ValidPassword123!');
    expect(user).toBeDefined();
    expect(user.id).toBe('user-123');
    expect(user.roles).toContain(Role.ADMIN);
  });

  it('should return null for invalid password', async () => {
    const user = await authService.validateUser('admin@restaurante.com', 'WrongPassword!');
    expect(user).toBeNull();
  });

  it('should login successfully and return access token and user payload', async () => {
    const result = await authService.login({
      email: 'admin@restaurante.com',
      password: 'ValidPassword123!',
    });

    expect(result.authResponse.accessToken).toBe('mocked_jwt_token');
    expect(result.authResponse.user.email).toBe('admin@restaurante.com');
    expect(result.refreshToken).toBe('mocked_jwt_token');
  });

  it('should throw UnauthorizedException on invalid credentials', async () => {
    await expect(
      authService.login({
        email: 'admin@restaurante.com',
        password: 'IncorrectPassword',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
