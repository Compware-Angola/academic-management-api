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

@Module({
  imports: [TypeOrmModule.forFeature([AcademicYear])],
  controllers: [StudentsController, BeginningStudentProcessController],

  providers: [
    StudentsService,
    AnoLectivoUtil,
    StudentNoteService,
    StudentsEnrollmentUCService,
    StudentsEnrollmentPendentUCService,
    StudentsChangeCourse,
    StudentsResultPlanService,
    BeginningStudentProcessService
  ],
})
export class StudentsModule { }
