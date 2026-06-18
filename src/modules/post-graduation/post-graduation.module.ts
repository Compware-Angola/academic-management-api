import { Module } from '@nestjs/common';
import { PostGraduationController } from './post-graduation.controller';
import { PostGraduationService } from './post-graduation.service';
import { PostGraduationExamMarkingService } from './post-graduation-exam-marking.service';
import { PostGraduationAttendanceListService } from './post-graduation-attendance-list.service';
import { PostGraduationNoteLaunchService } from './post-graduation-note-launch.service';

import { CandidatesService } from './services/candidates.service';
import { CandidatesController } from './controllers/candidates.controller';
import { GuidanceResearchManagementController } from './controllers/guidance-research-management.controller';
import { GuidanceResearchManagementService } from './services/guidance-research-management.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
  controllers: [PostGraduationController, CandidatesController, GuidanceResearchManagementController],
  imports: [
    BullModule.registerQueue({
      name: 'final_average',
    }),
  ],

  providers: [
    PostGraduationService,
    PostGraduationExamMarkingService,
    PostGraduationAttendanceListService,
    PostGraduationNoteLaunchService,
    CandidatesService,
    GuidanceResearchManagementService
  ],
  exports: [],
})
export class PostGraduationModule { }


