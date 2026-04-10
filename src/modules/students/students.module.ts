import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { StudentNoteService } from './sudents-notes.service';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService, StudentNoteService],
})
export class StudentsModule {}
