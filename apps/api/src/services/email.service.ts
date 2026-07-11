import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', 'localhost'),
      port: config.get<number>('SMTP_PORT', 1025),
      auth: config.get('SMTP_USER')
        ? { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASS') }
        : undefined,
    });
  }

  private get appName() {
    return this.config.get('APP_NAME', 'NexusOS');
  }

  private get webUrl() {
    return this.config.get('WEB_URL', 'http://localhost:3001');
  }

  private get from() {
    return this.config.get('EMAIL_FROM', 'noreply@nexusos.dev');
  }

  async sendVerificationEmail(to: string, token: string) {
    const url = `${this.webUrl}/verify-email?token=${token}`;
    await this.send(to, `Verify your ${this.appName} account`, this.verificationTemplate(url));
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const url = `${this.webUrl}/reset-password?token=${token}`;
    await this.send(to, `Reset your ${this.appName} password`, this.resetPasswordTemplate(url));
  }

  async sendMagicLinkEmail(to: string, token: string) {
    const url = `${this.webUrl}/magic-login?token=${token}`;
    await this.send(to, `Your ${this.appName} magic link`, this.magicLinkTemplate(url));
  }

  async sendInvitationEmail(to: string, orgName: string, inviterName: string, token: string) {
    const url = `${this.webUrl}/invite?token=${token}`;
    await this.send(
      to,
      `You've been invited to join ${orgName} on ${this.appName}`,
      this.invitationTemplate(url, orgName, inviterName),
    );
  }

  private async send(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}:`, err);
    }
  }

  private verificationTemplate(url: string) {
    return `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0a0f1e;color:#f9fafb;border-radius:12px;">
        <h1 style="color:#6366f1;margin-bottom:8px;">Verify your email</h1>
        <p>Thanks for signing up for <strong>${this.appName}</strong>. Click the button below to verify your email address.</p>
        <a href="${url}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Verify Email</a>
        <p style="color:#9ca3af;font-size:13px;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
      </div>`;
  }

  private resetPasswordTemplate(url: string) {
    return `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0a0f1e;color:#f9fafb;border-radius:12px;">
        <h1 style="color:#6366f1;margin-bottom:8px;">Reset your password</h1>
        <p>You requested a password reset for your <strong>${this.appName}</strong> account.</p>
        <a href="${url}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Reset Password</a>
        <p style="color:#9ca3af;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
      </div>`;
  }

  private magicLinkTemplate(url: string) {
    return `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0a0f1e;color:#f9fafb;border-radius:12px;">
        <h1 style="color:#6366f1;margin-bottom:8px;">Your magic link</h1>
        <p>Click the button below to sign in to <strong>${this.appName}</strong> instantly. No password needed.</p>
        <a href="${url}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Sign in to ${this.appName}</a>
        <p style="color:#9ca3af;font-size:13px;">This link expires in 15 minutes and can only be used once.</p>
      </div>`;
  }

  private invitationTemplate(url: string, orgName: string, inviterName: string) {
    return `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0a0f1e;color:#f9fafb;border-radius:12px;">
        <h1 style="color:#6366f1;margin-bottom:8px;">You're invited!</h1>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on <strong>${this.appName}</strong>.</p>
        <a href="${url}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Accept Invitation</a>
        <p style="color:#9ca3af;font-size:13px;">This invitation expires in 7 days.</p>
      </div>`;
  }
}
