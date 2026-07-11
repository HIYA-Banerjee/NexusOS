import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, userId: string, dto: any) {
    return this.prisma.document.create({
      data: {
        orgId,
        authorId: userId,
        title: dto.title,
        content: dto.content || {},
        type: dto.type || 'DOCUMENT',
        visibility: dto.visibility || 'PRIVATE',
      },
    });
  }

  async findAll(orgId: string) {
    return this.prisma.document.findMany({
      where: { orgId, deletedAt: null },
      select: {
        id: true,
        title: true,
        type: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, displayName: true } },
      },
    });
    if (!doc || doc.deletedAt) throw new NotFoundException('Document not found');
    return doc;
  }
}
