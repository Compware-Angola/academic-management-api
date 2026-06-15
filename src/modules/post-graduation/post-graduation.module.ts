import { Module } from '@nestjs/common';
import { PostGraduationController } from './post-graduation.controller';
import { PostGraduationService } from './post-graduation.service';
import { PostGraduationExamMarkingService } from './post-graduation-exam-marking.service';
import { PostGraduationAttendanceListService } from './post-graduation-attendance-list.service';
import { PostGraduationNoteLaunchService } from './post-graduation-note-launch.service';

@Module({
  controllers: [PostGraduationController],
  providers: [
    PostGraduationService,
    PostGraduationExamMarkingService,
    PostGraduationAttendanceListService,
    PostGraduationNoteLaunchService,
  ],
  exports: [PostGraduationService],
})
export class PostGraduationModule {}
