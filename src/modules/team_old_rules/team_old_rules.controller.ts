import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, Query } from '@nestjs/common';
import { TeamOldRulesService } from './team_old_rules.service';

@Controller('team-old-rules')
export class TeamOldRulesController {
  constructor(private readonly teamOldRulesService: TeamOldRulesService) {}


  @Get()
  async findAllUnidadeCurricular(
    @Query('turma') turma?: string,
    @Query('anoLectivo') anoLectivo?: string,
    @Query('semestre') semestre?: string,
  ) {
    // Validação básica e conversão para número
    const codigoTurma = turma ? parseInt(turma, 10) : undefined;
    const codigoAno = anoLectivo ? parseInt(anoLectivo, 10) : undefined;
    const codigoSemestre = semestre ? parseInt(semestre, 10) : undefined;

    // Validação simples (podes melhorar com class-validator se quiseres)
    if (!codigoTurma || !codigoAno) {
      throw new BadRequestException('Parâmetros "turma" e "anoLectivo" são obrigatórios');
    }

    return this.teamOldRulesService.findAllUnidadeCurricular(codigoTurma, codigoAno, codigoSemestre);
  }
  @Get('/turmas')
  async findAll(
    @Query('anoLectivo') anoLectivo?: string,
    @Query('classe') classe?: string,
    @Query('curso') curso?: string,
    @Query('periodo') periodo?: string,
  ) {
    const filters = {
      anoLectivo: anoLectivo ? parseInt(anoLectivo, 10) : undefined,
      classe: classe ? parseInt(classe, 10) : undefined,
      curso: curso ? parseInt(curso, 10) : undefined,
      periodo: periodo ? parseInt(periodo, 10) : undefined,
    };

    return this.teamOldRulesService.findAll(filters);
  }

}
