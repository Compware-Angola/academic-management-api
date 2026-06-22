import { Module } from '@nestjs/common';
import { PostGraduationController } from './post-graduation.controller';
import { PostGraduationService } from './post-graduation.service';
import { PostGraduationExamMarkingService } from './post-graduation-exam-marking.service';
import { PostGraduationAttendanceListService } from './post-graduation-attendance-list.service';
import { PostGraduationNoteLaunchService } from './post-graduation-note-launch.service';
import { PostGraduationAgendaLaunchService } from './post-graduation-agenda-launch.service';
import { PostGraduationAgendaValidationService } from './post-graduation-agenda-validation.service';

import { CandidatesService } from './services/candidates.service';
import { CandidatesController } from './controllers/candidates.controller';
import { GuidanceResearchManagementController } from './controllers/guidance-research-management.controller';
import { GuidanceResearchManagementService } from './services/guidance-research-management.service';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [
    PostGraduationController,
    CandidatesController,
    GuidanceResearchManagementController,
  ],
  imports: [
    BullModule.registerQueue({
      name: 'final_average',
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  providers: [
    PostGraduationService,
    PostGraduationExamMarkingService,
    PostGraduationAttendanceListService,
    PostGraduationNoteLaunchService,
    PostGraduationAgendaLaunchService,
    PostGraduationAgendaValidationService,
    CandidatesService,
    GuidanceResearchManagementService,
  ],
  exports: [],
})
export class PostGraduationModule {}
