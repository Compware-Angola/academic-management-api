import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { AcademicYear } from '../shared/entities/academic.year.entity';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { AnoLectivoUtil } from '../util/current-academic-year';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicYear])],
  controllers: [StudentsController],
  providers: [StudentsService,AnoLectivoUtil],
})
export class StudentsModule {}
