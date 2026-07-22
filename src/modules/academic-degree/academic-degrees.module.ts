import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicDegree } from './entities/academic-degree.entity';
import { AcademicDegreeController } from './academic-degres.controller';
import { AcademicDegreeService } from './academic-degree';

@Module({
    imports: [TypeOrmModule.forFeature([AcademicDegree])],
    controllers: [AcademicDegreeController],
    providers: [AcademicDegreeService]
})
export class AcademicDegreeModule { }