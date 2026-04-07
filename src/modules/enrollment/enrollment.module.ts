import { Module } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentRegistrationsUCService } from './registrations.at.UC.service';
import { registrationsAtUcController } from './registrations.at.UC.controller';
import { EstudantesService } from './estatiticas.service';

@Module({
  controllers: [EnrollmentController,registrationsAtUcController],
  providers: [EnrollmentService,EnrollmentRegistrationsUCService,EstudantesService],
})
export class EnrollmentModule {}
