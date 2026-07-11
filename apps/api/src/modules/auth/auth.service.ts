import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../../services/email.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  MagicLinkDto,
} from './dto/auth.dto';

const SALT_ROUNDS = 12;
const LOCK_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService,
  ) {}

  // ── Registration ──────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const verificationToken = uuidv4();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName || `${dto.firstName ?? ''} ${dto.lastName ?? ''}`.trim() || null,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      select: { id: true, email: true, displayName: true, emailVerified: true },
    });

    // Store token as a magic link for email verification
    await this.prisma.magicLink.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });

    await this.email.sendVerificationEmail(user.email, verificationToken);

    return { message: 'Registration successful. Please verify your email.', userId: user.id };
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');

    // Account lock check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account locked. Try again in ${minutesLeft} minutes.`);
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= LOCK_ATTEMPTS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
            : null,
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2FA check
    if (user.twoFactorEnabled) {
      if (!dto.totpCode) {
        return { requiresTwoFactor: true, userId: user.id };
      }
      const valid = authenticator.verify({
        token: dto.totpCode,
        secret: user.twoFactorSecret!,
      });
      if (!valid) throw new UnauthorizedException('Invalid 2FA code');
    }

    // Reset failed attempts & update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date(),
      },
    });

    return this.generateTokenPair(user);
  }

  // ── Token Management ──────────────────────────────────────────────────────

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.hashedRefreshToken) throw new UnauthorizedException();

    const valid = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    if (!valid) throw new UnauthorizedException('Invalid refresh token');

    return this.generateTokenPair(user);
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null, refreshTokenVersion: { increment: 1 } },
    });
    return { message: 'Logged out successfully' };
  }

  // ── Email Verification ────────────────────────────────────────────────────

  async verifyEmail(dto: VerifyEmailDto) {
    const link = await this.prisma.magicLink.findUnique({ where: { token: dto.token } });
    if (!link || link.usedAt || link.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: link.userId },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      }),
      this.prisma.magicLink.update({
        where: { id: link.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Email verified successfully' };
  }

  // ── Password Reset ────────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Always return success (security: don't reveal if email exists)
    if (!user) return { message: 'If this email is registered, you will receive reset instructions.' };

    const token = uuidv4();
    await this.prisma.magicLink.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
      },
    });

    await this.email.sendPasswordResetEmail(user.email, token);
    return { message: 'If this email is registered, you will receive reset instructions.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const link = await this.prisma.magicLink.findUnique({ where: { token: dto.token } });
    if (!link || link.usedAt || link.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: link.userId },
        data: { passwordHash, refreshTokenVersion: { increment: 1 } },
      }),
      this.prisma.magicLink.update({
        where: { id: link.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Password reset successfully. Please log in.' };
  }

  // ── Magic Link ────────────────────────────────────────────────────────────

  async sendMagicLink(dto: MagicLinkDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return { message: 'If this email is registered, you will receive a magic link.' };

    const token = uuidv4();
    await this.prisma.magicLink.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
      },
    });

    await this.email.sendMagicLinkEmail(user.email, token);
    return { message: 'If this email is registered, you will receive a magic link.' };
  }

  async loginWithMagicLink(token: string) {
    const link = await this.prisma.magicLink.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!link || link.usedAt || link.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired magic link');
    }

    await this.prisma.magicLink.update({ where: { id: link.id }, data: { usedAt: new Date() } });
    await this.prisma.user.update({
      where: { id: link.userId },
      data: { emailVerified: true, lastLogin: new Date() },
    });

    return this.generateTokenPair(link.user);
  }

  // ── Two-Factor Auth ───────────────────────────────────────────────────────

  async setup2FA(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, this.config.get('TOTP_ISSUER', 'NexusOS'), secret);
    const qrCode = await qrcode.toDataURL(otpauth);

    // Temporarily store secret (not yet active)
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });

    return { secret, qrCode };
  }

  async enable2FA(userId: string, totpCode: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.twoFactorSecret) throw new BadRequestException('2FA not initialized');

    const valid = authenticator.verify({ token: totpCode, secret: user.twoFactorSecret });
    if (!valid) throw new UnauthorizedException('Invalid 2FA code');

    const backupCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).slice(2, 10).toUpperCase(),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, backupCodes },
    });

    return { message: '2FA enabled successfully', backupCodes };
  }

  async disable2FA(userId: string, totpCode: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.twoFactorEnabled) throw new BadRequestException('2FA not enabled');

    const valid = authenticator.verify({ token: totpCode, secret: user.twoFactorSecret! });
    if (!valid) throw new UnauthorizedException('Invalid 2FA code');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, backupCodes: [] },
    });

    return { message: '2FA disabled' };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async generateTokenPair(user: { id: string; email: string; role: string; refreshTokenVersion: number }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      version: user.refreshTokenVersion,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    await this.prisma.user.update({ where: { id: user.id }, data: { hashedRefreshToken } });

    return { accessToken, refreshToken };
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        role: true,
        emailVerified: true,
        twoFactorEnabled: true,
        timezone: true,
        locale: true,
        lastLogin: true,
        createdAt: true,
      },
    });
  }
}
