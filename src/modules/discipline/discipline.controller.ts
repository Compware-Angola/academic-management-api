import { Controller, Get, ValidationPipe, Query, Req } from '@nestjs/common';
import { DisciplineService } from './discipline.service';

import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FindDisciplinaAlunoDTO } from './dto/find-disciplina-aluno.dto';
import { FindDisciplinasDto } from './dto/find-disciplinas.dto';
@ApiTags("DISCIPLINAS")
@Controller('discipline')
export class DisciplineController {
  constructor(private readonly disciplineService: DisciplineService) {}
  @Get()
  @ApiOperation({
    summary: 'Listar disciplinas matriculadas do aluno',
  })
  findGradeCurricularAluno(
    @Query(ValidationPipe) query: FindDisciplinaAlunoDTO,
    @Req() req: any,
  ) {
    return this.disciplineService.findGradeCurricularAluno(query);
  }

@Get("all")
 @ApiOperation({
    summary: 'Listar disciplinas',
  })
async findDisciplinas(@Query() dto: FindDisciplinasDto) {
  return this.disciplineService.findDisciplinas(dto);
}
}
