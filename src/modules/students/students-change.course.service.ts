import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateStudentEnrollmentUC } from './dto/create-student-enrollment-uc';
import { STATUS_GRADE } from '../common/enums/status.grade';
import { ChangeCourseDTO } from './dto/change-course.dto';
import { AnoLectivoUtil } from '../util/current-academic-year';

@Injectable()
export class StudentsEnrollmentUCService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly anoLectivoUtil: AnoLectivoUtil,
  ) {}
  async chaneCourse(dto: ChangeCourseDTO) {
    const { PoloId, cursoId, matriculaId } = dto;
    let mudarCurso = true;
    let buscarHorario = true;
    const anoCorrente = await this.anoLectivoUtil.getAnoAtualId();
    if (!anoCorrente) {
      throw new BadRequestException('Ano letivo atual não encontrado');
    }
    if (!matriculaId) {
      throw new BadRequestException('Código da matrícula é obrigatório');
    }
    if (!PoloId && !cursoId) {
      throw new BadRequestException(
        'Polo ou curso deve ser informado para a alteração',
      );
    }
  }
}
