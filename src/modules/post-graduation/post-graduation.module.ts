import { Module } from '@nestjs/common';
import { PostGraduationController } from './post-graduation.controller';
import { PostGraduationService } from './post-graduation.service';

@Module({
  controllers: [PostGraduationController],
  providers: [PostGraduationService],
  exports: [PostGraduationService],
})
export class PostGraduationModule {}
