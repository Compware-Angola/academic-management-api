import { Module } from '@nestjs/common';
import { PostGraduationController } from './post-graduation.controller';
import { PostGraduationService } from './post-graduation.service';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';

@Module({
  controllers: [PostGraduationController, CandidatesController],
  providers: [PostGraduationService, CandidatesService],
})
export class PostGraduationModule {}
