import { Module } from '@nestjs/common';
import { PostGraduationController } from './post-graduation.controller';
import { PostGraduationService } from './post-graduation.service';
import { PostGraduationExamMarkingService } from './post-graduation-exam-marking.service';
import { PostGraduationAttendanceListService } from './post-graduation-attendance-list.service';
import { PostGraduationNoteLaunchService } from './post-graduation-note-launch.service';
import { CandidatesService } from './services/candidates.service';
import { CandidatesController } from './controllers/candidates.controller';

@Module({
  controllers: [PostGraduationController, CandidatesController],
  providers: [
    PostGraduationService,
    PostGraduationExamMarkingService,
    PostGraduationAttendanceListService,
    PostGraduationNoteLaunchService,
    CandidatesService
  ],
  exports: [],
})
export class PostGraduationModule { }


