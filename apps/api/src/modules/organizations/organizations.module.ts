import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { EmailService } from '../../services/email.service';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, EmailService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
