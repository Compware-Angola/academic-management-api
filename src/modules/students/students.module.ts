import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';

import { AcademicYear } from '../shared/entities/academic.year.entity';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { AnoLectivoUtil } from '../util/current-academic-year';

import { StudentNoteService } from './sudents-notes.service';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicYear])],
  controllers: [StudentsController],

  providers: [StudentsService,AnoLectivoUtil,StudentNoteService],



})
export class StudentsModule {}
