import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Auth & Staff')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión como miembro del personal (Staff)' })
  @ApiResponse({ status: 200, description: 'Inicio de sesión exitoso', type: AuthResponseDto })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { authResponse, refreshToken } = await this.authService.login(loginDto);

    // Set secure HttpOnly cookies
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('staff_token', authResponse.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return authResponse;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token con refresh token en cookie o body' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const refreshToken = req.cookies?.refresh_token || (req.body as any)?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('No se proporcionó refresh token');
    }

    const newAccessToken = await this.authService.refreshAccessToken(refreshToken);
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('staff_token', newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000,
    });

    return { accessToken: newAccessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión y limpiar cookies del personal' })
  async logout(@Res({ passthrough: true }) res: Response): Promise<{ message: string }> {
    res.clearCookie('staff_token');
    res.clearCookie('refresh_token');
    return { message: 'Sesión finalizada exitosamente' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('staff_token')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async getMe(@CurrentUser() user: UserProfileDto): Promise<UserProfileDto> {
    return this.authService.getProfile(user.id);
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Endpoint de prueba exclusivo para rol ADMIN' })
  async adminOnlyCheck(@CurrentUser() user: UserProfileDto) {
    return { message: 'Acceso autorizado como ADMIN', user };
  }

  @Get('kitchen-or-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KITCHEN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Endpoint de prueba para Cocina o Admin' })
  async kitchenCheck(@CurrentUser() user: UserProfileDto) {
    return { message: 'Acceso autorizado para KITCHEN o ADMIN', user };
  }
}
