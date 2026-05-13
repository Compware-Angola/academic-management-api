import { Module } from '@nestjs/common';
import { PrazosService } from './prazos.service';
import { PrazosController } from './prazo.controller';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicYear } from '../shared/entities/academic.year.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicYear])],
  controllers: [PrazosController],
  providers: [PrazosService, AnoLectivoUtil],
  exports: [],
})
export class PrazosModule {}
