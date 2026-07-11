import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../../services/email.service';
import { v4 as uuidv4 } from 'uuid';
import { OrgRole } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async create(userId: string, dto: { name: string; slug?: string; description?: string }) {
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = await this.prisma.organization.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Organization slug already taken');

    return this.prisma.organization.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        ownerId: userId,
        members: {
          create: { userId, role: OrgRole.OWNER },
        },
      },
      include: { members: { include: { user: { select: { id: true, email: true, displayName: true } } } } },
    });
  }

  async findAll(userId: string) {
    return this.prisma.organization.findMany({
      where: { members: { some: { userId } }, deletedAt: null },
      include: {
        _count: { select: { members: true, projects: true } },
      },
    });
  }

  async findOne(orgId: string, userId: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId, members: { some: { userId } }, deletedAt: null },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, displayName: true, avatar: true } } },
        },
        teams: true,
        _count: { select: { projects: true, members: true } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(orgId: string, userId: string, dto: Partial<{ name: string; description: string; logo: string }>) {
    await this.assertRole(orgId, userId, [OrgRole.OWNER, OrgRole.ADMIN]);
    return this.prisma.organization.update({ where: { id: orgId }, data: dto });
  }

  async delete(orgId: string, userId: string) {
    await this.assertRole(orgId, userId, [OrgRole.OWNER]);
    return this.prisma.organization.update({ where: { id: orgId }, data: { deletedAt: new Date() } });
  }

  // ── Members ───────────────────────────────────────────────────────────────

  async getMembers(orgId: string, userId: string) {
    await this.assertMember(orgId, userId);
    return this.prisma.orgMember.findMany({
      where: { orgId },
      include: { user: { select: { id: true, email: true, displayName: true, avatar: true, lastLogin: true } } },
    });
  }

  async updateMemberRole(orgId: string, actorId: string, targetUserId: string, role: OrgRole) {
    await this.assertRole(orgId, actorId, [OrgRole.OWNER, OrgRole.ADMIN]);
    if (role === OrgRole.OWNER) throw new ForbiddenException('Cannot transfer ownership via this endpoint');
    return this.prisma.orgMember.update({ where: { orgId_userId: { orgId, userId: targetUserId } }, data: { role } });
  }

  async removeMember(orgId: string, actorId: string, targetUserId: string) {
    await this.assertRole(orgId, actorId, [OrgRole.OWNER, OrgRole.ADMIN]);
    if (actorId === targetUserId) throw new BadRequestException('Cannot remove yourself');
    return this.prisma.orgMember.delete({ where: { orgId_userId: { orgId, userId: targetUserId } } });
  }

  // ── Invitations ───────────────────────────────────────────────────────────

  async invite(orgId: string, actorId: string, dto: { email: string; role: OrgRole }) {
    await this.assertRole(orgId, actorId, [OrgRole.OWNER, OrgRole.ADMIN]);

    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    const actor = await this.prisma.user.findUniqueOrThrow({ where: { id: actorId } });

    // Check existing membership
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      const member = await this.prisma.orgMember.findUnique({
        where: { orgId_userId: { orgId, userId: existingUser.id } },
      });
      if (member) throw new ConflictException('User is already a member');
    }

    const token = uuidv4();
    const invitation = await this.prisma.invitation.create({
      data: {
        orgId,
        email: dto.email,
        role: dto.role,
        token,
        senderId: actorId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    await this.email.sendInvitationEmail(dto.email, org.name, actor.displayName || actor.email, token);
    return invitation;
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { token } });
    if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.email !== invitation.email) throw new ForbiddenException('Invitation is for a different email');

    await this.prisma.$transaction([
      this.prisma.orgMember.create({
        data: { orgId: invitation.orgId, userId, role: invitation.role },
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      }),
    ]);

    return { message: 'Invitation accepted', orgId: invitation.orgId };
  }

  // ── Teams ─────────────────────────────────────────────────────────────────

  async createTeam(orgId: string, userId: string, dto: { name: string; description?: string }) {
    await this.assertMember(orgId, userId);
    return this.prisma.team.create({
      data: {
        orgId,
        name: dto.name,
        description: dto.description,
        members: { create: { userId, role: 'LEAD' } },
      },
    });
  }

  async getTeams(orgId: string, userId: string) {
    await this.assertMember(orgId, userId);
    return this.prisma.team.findMany({
      where: { orgId },
      include: {
        members: { include: { user: { select: { id: true, email: true, displayName: true, avatar: true } } } },
        _count: { select: { members: true } },
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  async assertMember(orgId: string, userId: string) {
    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this organization');
    return member;
  }

  async assertRole(orgId: string, userId: string, roles: OrgRole[]) {
    const member = await this.assertMember(orgId, userId);
    if (!roles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return member;
  }
}
