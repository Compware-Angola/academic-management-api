import { Module } from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './assessment.controller';
import { AnoLectivoUtil } from '../util/current-academic-year';

import { TypeOrmModule } from '@nestjs/typeorm';
import { DefineFormulaUcService } from './define_formula_uc.service';
import { DefineFormulaUcOralService } from './define_formula_uc_oral.service';
import { NoteReleaseService } from './note_release.service';
import { AcademicYear } from '../shared/entities/academic.year.entity';
import { StudentsEnrolledByAssessmentsService } from './students-enrolled-by-assessments.service';
import { PermissionAssessmentsService } from './permission-assessment.service';
import { StatisticAssessmentsService } from './statistic-assessment.service';
import { MarkingAssessmentService } from './making-assessment.service';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicYear])],
  controllers: [AssessmentController],
  providers: [
    AssessmentService,
    AnoLectivoUtil,
    DefineFormulaUcService,
    DefineFormulaUcOralService,
    NoteReleaseService,
    StudentsEnrolledByAssessmentsService,
    PermissionAssessmentsService,
    StatisticAssessmentsService,
    MarkingAssessmentService,
  ],
})
export class AssessmentModule {}
