import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: { actorId?: string; orgId?: string; action: AuditAction; entity: string; entityId?: string; payload?: any; ipAddress?: string }) {
    return this.prisma.auditLog.create({ data });
  }

  async findAll(orgId: string) {
    return this.prisma.auditLog.findMany({
      where: { orgId },
      include: { actor: { select: { id: true, email: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
