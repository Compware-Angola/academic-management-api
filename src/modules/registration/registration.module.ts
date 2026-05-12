import { Module } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { RegistrationController } from './registration.controller';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicYear } from '../shared/entities/academic.year.entity';

@Module({
  imports: [
  TypeOrmModule.forFeature([AcademicYear]),
],
  controllers: [RegistrationController],
  providers: [
    RegistrationService,
    AnoLectivoUtil
  ],
})
export class RegistrationModule {}
