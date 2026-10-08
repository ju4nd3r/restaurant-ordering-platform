import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        roles: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isMatch = await argon2.verify(user.passwordHash, pass);
    if (!isMatch) {
      return null;
    }

    return {
      id: user.id,
      restaurantId: user.restaurantId,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles.map((r) => r.role),
    };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ authResponse: AuthResponseDto; refreshToken: string }> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      this.logger.warn(`Intento de login fallido para: ${loginDto.email}`);
      throw new UnauthorizedException('Credenciales inválidas o usuario inactivo');
    }

    const payload: UserProfileDto = {
      id: user.id,
      restaurantId: user.restaurantId,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret:
        process.env.JWT_ACCESS_SECRET ||
        'super_secret_access_jwt_key_change_in_production_min_32_chars',
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN as any) || '15m',
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email },
      {
        secret:
          process.env.JWT_REFRESH_SECRET ||
          'super_secret_refresh_jwt_key_change_in_production_min_32_chars',
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as any) || '7d',
      },
    );

    return {
      authResponse: {
        accessToken,
        user: payload,
      },
      refreshToken,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const decoded = await this.jwtService.verifyAsync(refreshToken, {
        secret:
          process.env.JWT_REFRESH_SECRET ||
          'super_secret_refresh_jwt_key_change_in_production_min_32_chars',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { roles: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Usuario no válido o inactivo');
      }

      const payload: UserProfileDto = {
        id: user.id,
        restaurantId: user.restaurantId,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles.map((r) => r.role),
      };

      return this.jwtService.signAsync(payload, {
        secret:
          process.env.JWT_ACCESS_SECRET ||
          'super_secret_access_jwt_key_change_in_production_min_32_chars',
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN as any) || '15m',
      });
    } catch {
      throw new UnauthorizedException('Refresh token expirado o inválido');
    }
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      id: user.id,
      restaurantId: user.restaurantId,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles.map((r) => r.role),
    };
  }
}
