import { Module } from '@nestjs/common';
import { TeacherService } from './users.service';
import { TeacherController } from './users.controller';

@Module({
  controllers: [TeacherController],
  providers: [TeacherService],
})
export class TeacherModule {}
