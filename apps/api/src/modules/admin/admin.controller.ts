import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get system-wide stats (Super Admin only)' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  getUsers() {
    return this.adminService.getUsers();
  }

  @Get('feature-flags')
  @ApiOperation({ summary: 'Get all feature flags' })
  getFeatureFlags() {
    return this.adminService.getFeatureFlags();
  }
}
