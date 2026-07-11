import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrgRole } from '@prisma/client';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  IsString, IsEmail, IsOptional, IsEnum, MinLength, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateOrgDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(80) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

class UpdateOrgDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logo?: string;
}

class InviteMemberDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ enum: OrgRole, default: OrgRole.MEMBER }) @IsEnum(OrgRole) role: OrgRole;
}

class UpdateRoleDto {
  @ApiProperty({ enum: OrgRole }) @IsEnum(OrgRole) role: OrgRole;
}

class CreateTeamDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

@ApiTags('Organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new organization' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateOrgDto) {
    return this.orgsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get current user's organizations" })
  findAll(@CurrentUser() user: { id: string }) {
    return this.orgsService.findAll(user.id);
  }

  @Get(':orgId')
  @ApiOperation({ summary: 'Get organization details' })
  findOne(@Param('orgId') orgId: string, @CurrentUser() user: { id: string }) {
    return this.orgsService.findOne(orgId, user.id);
  }

  @Patch(':orgId')
  @ApiOperation({ summary: 'Update organization' })
  update(@Param('orgId') orgId: string, @CurrentUser() user: { id: string }, @Body() dto: UpdateOrgDto) {
    return this.orgsService.update(orgId, user.id, dto);
  }

  @Delete(':orgId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete organization (owner only)' })
  delete(@Param('orgId') orgId: string, @CurrentUser() user: { id: string }) {
    return this.orgsService.delete(orgId, user.id);
  }

  // ── Members ───────────────────────────────────────────────────────────────

  @Get(':orgId/members')
  @ApiOperation({ summary: 'Get organization members' })
  getMembers(@Param('orgId') orgId: string, @CurrentUser() user: { id: string }) {
    return this.orgsService.getMembers(orgId, user.id);
  }

  @Post(':orgId/invitations')
  @ApiOperation({ summary: 'Invite a member to the organization' })
  invite(@Param('orgId') orgId: string, @CurrentUser() user: { id: string }, @Body() dto: InviteMemberDto) {
    return this.orgsService.invite(orgId, user.id, dto);
  }

  @Public()
  @Post('invitations/:token/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept organization invitation' })
  acceptInvitation(@Param('token') token: string, @CurrentUser() user: { id: string }) {
    return this.orgsService.acceptInvitation(token, user.id);
  }

  @Patch(':orgId/members/:userId/role')
  @ApiOperation({ summary: 'Update member role' })
  updateRole(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @CurrentUser() actor: { id: string },
    @Body() dto: UpdateRoleDto,
  ) {
    return this.orgsService.updateMemberRole(orgId, actor.id, userId, dto.role);
  }

  @Delete(':orgId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from organization' })
  removeMember(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @CurrentUser() actor: { id: string },
  ) {
    return this.orgsService.removeMember(orgId, actor.id, userId);
  }

  // ── Teams ─────────────────────────────────────────────────────────────────

  @Post(':orgId/teams')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a team within an organization' })
  createTeam(@Param('orgId') orgId: string, @CurrentUser() user: { id: string }, @Body() dto: CreateTeamDto) {
    return this.orgsService.createTeam(orgId, user.id, dto);
  }

  @Get(':orgId/teams')
  @ApiOperation({ summary: 'Get all teams in an organization' })
  getTeams(@Param('orgId') orgId: string, @CurrentUser() user: { id: string }) {
    return this.orgsService.getTeams(orgId, user.id);
  }
}
