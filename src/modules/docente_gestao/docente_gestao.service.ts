import { Injectable } from '@nestjs/common';
import { CreateDocenteGestaoDto } from './dto/create-docente_gestao.dto';
import { UpdateDocenteGestaoDto } from './dto/update-docente_gestao.dto';
import { DataSource } from 'typeorm';

@Injectable()
export class DocenteGestaoService {
    constructor(private readonly dataSource: DataSource) {}
  create(createDocenteGestaoDto: CreateDocenteGestaoDto) {
    return 'This action adds a new docenteGestao';
  }

  findAll() {
    return `This action returns all docenteGestao`;
  }

  findOne(id: number) {
    return `This action returns a #${id} docenteGestao`;
  }

  update(id: number, updateDocenteGestaoDto: UpdateDocenteGestaoDto) {
    return `This action updates a #${id} docenteGestao`;
  }

  remove(id: number) {
    return `This action removes a #${id} docenteGestao`;
  }
}
