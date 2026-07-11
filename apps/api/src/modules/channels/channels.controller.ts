import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChannelsService } from './channels.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Channels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@Controller('organizations/:orgId/channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new communication channel' })
  create(@Param('orgId') orgId: string, @CurrentUser() user: { id: string }, @Body() dto: any) {
    return this.channelsService.create(orgId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all channels the user is member of' })
  findAll(@Param('orgId') orgId: string, @CurrentUser() user: { id: string }) {
    return this.channelsService.findAll(orgId, user.id);
  }

  @Get(':channelId/messages')
  @ApiOperation({ summary: 'Get messages for a channel' })
  findMessages(@Param('channelId') channelId: string) {
    return this.channelsService.findMessages(channelId);
  }
}
