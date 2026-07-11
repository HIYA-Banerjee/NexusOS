import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across tasks, documents, channels' })
  search(@Query('orgId') orgId: string, @Query('q') query: string) {
    return this.searchService.search(orgId, query);
  }
}
