import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  MagicLinkDto,
  RefreshTokenDto,
  Enable2FADto,
  Verify2FADto,
} from './dto/auth.dto';

@ApiTags('Auth')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Registration & Login ──────────────────────────────────────────────────

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout and revoke tokens' })
  async logout(@CurrentUser() user: { id: string }) {
    return this.authService.logout(user.id);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user' })
  async getMe(@CurrentUser() user: { id: string }) {
    return this.authService.getMe(user.id);
  }

  // ── Token Refresh ─────────────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Body() dto: RefreshTokenDto, @CurrentUser() user: { id: string }) {
    return this.authService.refresh(user?.id, dto.refreshToken);
  }

  // ── Email Verification ────────────────────────────────────────────────────

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  // ── Password Reset ────────────────────────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token from email' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ── Magic Link ────────────────────────────────────────────────────────────

  @Public()
  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send magic link to email' })
  async sendMagicLink(@Body() dto: MagicLinkDto) {
    return this.authService.sendMagicLink(dto);
  }

  @Public()
  @Get('magic-link/:token')
  @ApiOperation({ summary: 'Authenticate with magic link token' })
  async loginWithMagicLink(@Param('token') token: string) {
    return this.authService.loginWithMagicLink(token);
  }

  // ── Two-Factor Auth ───────────────────────────────────────────────────────

  @Get('2fa/setup')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Initialize 2FA — returns QR code and secret' })
  async setup2FA(@CurrentUser() user: { id: string }) {
    return this.authService.setup2FA(user.id);
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Enable 2FA after verifying TOTP code' })
  async enable2FA(@CurrentUser() user: { id: string }, @Body() dto: Enable2FADto) {
    return this.authService.enable2FA(user.id, dto.totpCode);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Disable 2FA' })
  async disable2FA(@CurrentUser() user: { id: string }, @Body() dto: Verify2FADto) {
    return this.authService.disable2FA(user.id, dto.totpCode);
  }
}
