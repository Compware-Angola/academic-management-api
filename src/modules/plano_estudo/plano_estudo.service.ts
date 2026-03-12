import { Injectable } from '@nestjs/common';
import { CreatePlanoEstudoDto } from './dto/create-plano_estudo.dto';
import { UpdatePlanoEstudoDto } from './dto/update-plano_estudo.dto';

@Injectable()
export class PlanoEstudoService {
  create(createPlanoEstudoDto: CreatePlanoEstudoDto) {
    return 'This action adds a new planoEstudo';
  }

  findAll() {
    return `This action returns all planoEstudo`;
  }

  findOne(id: number) {
    return `This action returns a #${id} planoEstudo`;
  }

  update(id: number, updatePlanoEstudoDto: UpdatePlanoEstudoDto) {
    return `This action updates a #${id} planoEstudo`;
  }

  remove(id: number) {
    return `This action removes a #${id} planoEstudo`;
  }
}
