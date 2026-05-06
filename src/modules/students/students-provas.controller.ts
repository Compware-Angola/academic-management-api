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

  @Get('recurso/:codigoAnoLectivo/:codigoMatricula')
  async cadeirasRecurso(@Param() params: FindCadeirasRecursoDto) {
    return this.studentsProvasService.cadeirasRecurso({
      codigoAnoLectivo: params.codigoAnoLectivo,
      codigoMatricula: params.codigoMatricula,
    });
  }
  @Get('epoca-especial/:codigoAnoLectivo/:codigoMatricula')
  async cadeirasEpocaEspecial(@Param() params: FindCadeirasEpocaEspecialDto) {
    return this.studentsProvasService.cadeirasEpocaEspecial(params);
  }

  @Post('recurso/:codigoMatricula')
  async inscricaoRecurso(
    @Param('codigoMatricula', ParseIntPipe) codigoMatricula: number,
    @Body() body: CriarInscricaoRecursoBodyDTO,
  ) {
    return this.studentsProvasService.inscricaoRecurso({
      codigoMatricula: codigoMatricula,
      gradesAlunos: body.gradesAlunos,
    });
  }

  @Post('especial/:codigoMatricula')
  async inscricaoEpocaEspecial(
    @Param('codigoMatricula', ParseIntPipe) codigoMatricula: number,
    @Body() body: CriarInscricaoEpocaEspecialBodyDTO,
  ) {
    return this.studentsProvasService.inscricaoEpocaEspecial({
      codigoMatricula: codigoMatricula,
      gradesAlunos: body.gradesAlunos,
    });
  }

  @Get('recurso/cadeiras-inscritas/:codigoAnoLectivo/:codigoMatricula')
  async recursoCadeiraInscrita(@Param() params: FindCadeirasRecursoDto) {
    return this.studentsProvasService.recursoCadeiraInscrita(params);
  }

  @Get('epoca-especial/cadeiras-inscritas/:codigoAnoLectivo/:codigoMatricula')
  async epocaEspecialCadeiraInscrita(
    @Param() params: FindCadeirasEpocaEspecialDto,
  ) {
    return this.studentsProvasService.epocaEspecialCadeiraInscrita(params);
  }
}
