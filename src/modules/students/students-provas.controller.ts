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
  FindCadeirasMelhoriaDto,
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

  @Get('melhoria/:codigoAnoLectivo/:codigoMatricula')
  async cadeirasMelhoria(@Param() params: FindCadeirasMelhoriaDto) {
    return this.studentsProvasService.cadeirasMelhoria(params);
  }

  @Post('recurso/:codigoMatricula/:tipoCandidatura/:anoLectivo')
  async inscricaoRecurso(
    @Param('codigoMatricula', ParseIntPipe) codigoMatricula: number,
    @Param('tipoCandidatura', ParseIntPipe) tipoCandidatura: number,
    @Param('anoLectivo', ParseIntPipe) anoLectivo: number,
    @Body() body: CriarInscricaoRecursoBodyDTO,
  ) {
    return this.studentsProvasService.inscricaoRecurso({
      codigoMatricula,
      tipoCandidatura,
      anoLectivo,
      gradesAlunos: body.gradesAlunos,
    });
  }

  @Post('melhoria/:codigoMatricula/:tipoCandidatura/:anoLectivo')
  async inscricaoMelhoria(
    @Param('codigoMatricula', ParseIntPipe) codigoMatricula: number,
    @Param('tipoCandidatura', ParseIntPipe) tipoCandidatura: number,
    @Param('anoLectivo', ParseIntPipe) anoLectivo: number,
    @Body() body: CriarInscricaoRecursoBodyDTO,
  ) {
    return this.studentsProvasService.inscricaoMelhoria({
      codigoMatricula,
      tipoCandidatura,
      anoLectivo,
      gradesAlunos: body.gradesAlunos,
    });
  }

  @Post('epoca-especial/:codigoMatricula/:tipoCandidatura/:anoLectivo')
  async inscricaoEpocaEspecial(
    @Param('codigoMatricula', ParseIntPipe) codigoMatricula: number,
    @Param('tipoCandidatura', ParseIntPipe) tipoCandidatura: number,
    @Param('anoLectivo', ParseIntPipe) anoLectivo: number,
    @Body() body: CriarInscricaoEpocaEspecialBodyDTO,
  ) {
    return this.studentsProvasService.inscricaoEpocaEspecial({
      codigoMatricula,
      anoLectivo,
      gradesAlunos: body.gradesAlunos,
      tipoCandidatura,
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
