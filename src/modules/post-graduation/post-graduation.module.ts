import { Module } from '@nestjs/common';
import { PostGraduationController } from './post-graduation.controller';
import { PostGraduationService } from './post-graduation.service';
import { PostGraduationExamMarkingService } from './post-graduation-exam-marking.service';

@Module({
  controllers: [PostGraduationController],
  providers: [PostGraduationService, PostGraduationExamMarkingService],
  exports: [PostGraduationService],
})
export class PostGraduationModule {}
