import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { StudentNoteService } from './sudents-notes.service';
import { StudentsEnrollmentUCService } from './students-enrollment-uc.service';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService, StudentNoteService, StudentsEnrollmentUCService],
})
export class StudentsModule {}
