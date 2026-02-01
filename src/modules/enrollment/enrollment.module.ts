import { Module } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentRegistrationsUCService } from './registrations.at.UC.service';

@Module({
  controllers: [EnrollmentController],
  providers: [EnrollmentService,EnrollmentRegistrationsUCService],
})
export class EnrollmentModule {}
