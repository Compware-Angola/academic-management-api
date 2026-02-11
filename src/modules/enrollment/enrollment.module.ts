import { Module } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentRegistrationsUCService } from './registrations.at.UC.service';
import { registrationsAtUcController } from './registrations.at.UC.controller';

@Module({
  controllers: [EnrollmentController,registrationsAtUcController],
  providers: [EnrollmentService,EnrollmentRegistrationsUCService],
})
export class EnrollmentModule {}
