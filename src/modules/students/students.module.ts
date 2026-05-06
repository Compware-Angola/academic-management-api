import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { AcademicYear } from '../shared/entities/academic.year.entity';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { StudentNoteService } from './sudents-notes.service';
import { StudentsEnrollmentUCService } from './students-enrollment-uc.service';
import { StudentsEnrollmentPendentUCService } from './students-pendent-uc.service';
import { StudentsChangeCourse } from './students-change.course.service';
import { StudentsResultPlanService } from './students-result-plan.service';
import { BeginningStudentProcessController } from './beginning-student-process.controller';
import { BeginningStudentProcessService } from './beginning-student-process.service';
import { PreRegistrationController } from './pre-registration.controller';
import { PreRegistrationService } from './pre-registration.service';
import { StudentsProvasService } from './students-provas.service';
import { StudentsProvasController } from './students-provas.controller';
import { HttpModule } from '@nestjs/axios';
import { PrazosService } from '../prazos/prazos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AcademicYear]),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [
    StudentsController,
    BeginningStudentProcessController,
    PreRegistrationController,
    StudentsProvasController,
  ],

  providers: [
    StudentsService,
    AnoLectivoUtil,
    StudentNoteService,
    PreRegistrationService,
    StudentsEnrollmentUCService,
    StudentsEnrollmentPendentUCService,
    StudentsChangeCourse,
    StudentsResultPlanService,
    BeginningStudentProcessService,
    StudentsProvasService,
    PrazosService,
  ],
})
export class StudentsModule {}
