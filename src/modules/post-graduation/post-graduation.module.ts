import { Module } from '@nestjs/common';
import { PostGraduationController } from './post-graduation.controller';
import { PostGraduationService } from './post-graduation.service';
import { PostGraduationExamMarkingService } from './post-graduation-exam-marking.service';
import { CandidatesService } from './candidates.service';
import { CandidatesController } from './candidates.controller';

@Module({
  controllers: [PostGraduationController, CandidatesController],
  providers: [PostGraduationService, PostGraduationExamMarkingService, CandidatesService],
  exports: [],
})
export class PostGraduationModule { }
