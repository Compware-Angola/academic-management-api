import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import {
  CriarInscricaoEpocaEspecialBodyDTO,
  CriarInscricaoRecursoBodyDTO,
  FindCadeirasEpocaEspecialDto,
  FindCadeirasRecursoDto,
} from './dto/recursos.dto';
import { StudentsProvasService } from './students-provas.service';

@ApiTags('Provas')
@Controller('students/provas')
export class StudentsProvasController {
  constructor(private readonly studentsProvasService: StudentsProvasService) {}

  @Get('recurso/:anoLectivo/:codigoMatricula')
  async cadeirasRecurso(@Param() params: FindCadeirasRecursoDto) {
    return this.studentsProvasService.cadeirasRecurso({
      anoLectivo: params.anoLectivo,
      codigoMatricula: params.codigoMatricula,
    });
  }
  @Get('epoca-especial/:anoLectivo/:codigoMatricula')
  async cadeirasEpocaEspecial(@Param() params: FindCadeirasEpocaEspecialDto) {
    return this.studentsProvasService.cadeirasEpocaEspecial({
      anoLectivo: params.anoLectivo,
      codigoMatricula: params.codigoMatricula,
    });
  }

  @Post('recurso/:codigoMatricula')
  async inscricaoRecurso(
    @Param('codigoMatricula', ParseIntPipe) codigoMatricula: number,
    @Body() body: CriarInscricaoRecursoBodyDTO,
  ) {
    return this.studentsProvasService.inscricaoRecurso({
      codigoMatricula: codigoMatricula,
      codigoGradeAluno: body.codigoGradeAluno,
    });
  }

  @Post('especial/:codigoMatricula')
  async inscricaoEpocaEspecial(
    @Param('codigoMatricula', ParseIntPipe) codigoMatricula: number,
    @Body() body: CriarInscricaoEpocaEspecialBodyDTO,
  ) {
    return this.studentsProvasService.inscricaoEpocaEspecial({
      codigoMatricula: codigoMatricula,
      codigoGradeAluno: body.codigoGradeAluno,
    });
  }
}
