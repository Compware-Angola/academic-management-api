import { Module } from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './assessment.controller';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DefineFormulaUcService } from './define_formula_uc.service';
import { DefineFormulaUcOralService } from './define_formula_uc_oral.service';
import { NoteReleaseService } from './note_release.service';
import { AcademicYear } from '../shared/entities/academic.year.entity';
import { HistoryNoteReleaseService } from './history_note_release.service';
import { GeneralParametersForEvaluationService } from './general_parameters_for_evaluation.service';
import { AgendaLaunchService } from './agenda_launch.service';
import { GenaralAgendaService } from './general_agenda.service';
import { AttendanceListService } from './attendancelist.service';

@Module({
  imports: [    TypeOrmModule.forFeature([
  
        AcademicYear,
     
      ]),],
  controllers: [AssessmentController],
  providers: [AttendanceListService,GenaralAgendaService,AgendaLaunchService,AssessmentService,AnoLectivoUtil, DefineFormulaUcService, DefineFormulaUcOralService,NoteReleaseService,HistoryNoteReleaseService, GeneralParametersForEvaluationService],
})
export class AssessmentModule {}
