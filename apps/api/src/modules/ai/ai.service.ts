import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  async chat(userId: string, dto: { prompt: string; conversationId?: string }) {
    // Basic AI mock logic for testing
    let conversationId = dto.conversationId;
    if (!conversationId) {
      const conv = await this.prisma.aIConversation.create({
        data: {
          userId,
          title: dto.prompt.slice(0, 30),
        },
      });
      conversationId = conv.id;
    }

    await this.prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: dto.prompt,
      },
    });

    const reply = `I am your NexusOS Assistant. You said: "${dto.prompt}". How can I help you manage your enterprise today?`;

    await this.prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: reply,
      },
    });

    return {
      conversationId,
      reply,
    };
  }
}
