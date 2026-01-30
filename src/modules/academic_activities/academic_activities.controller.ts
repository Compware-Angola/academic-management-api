import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AcademicActivitiesService } from './academic_activities.service';
import { PermissionsGuard } from '../common/secret/permissions.guard';
import { RemoteJwtAuthGuard } from '../common/guard/remote.jwt-auth.guard';
import { FindMarcacaoPrazoDTO } from './dto/find-marcacao-prova-prazo.dto';
import { promptToCreateAndEditService } from './prompt-to-create-and-edit.service';
import { TypeAvaliation } from './util/enum/prompt';
import { ApiQuery } from '@nestjs/swagger/dist/decorators/api-query.decorator';

//@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('academic-activities')
export class AcademicActivitiesController {
  constructor(
    private readonly academicActivitiesService: AcademicActivitiesService,
    private readonly promptToCreateAndEditService: promptToCreateAndEditService,
  ) { }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.academicActivitiesService.deleteAcademicActivities(+id);
  }
  @Get('marcacao-prova-prazo')
  async getAllPauta(@Query() query: FindMarcacaoPrazoDTO) {
    return this.academicActivitiesService.findMarcacaoProvaPrazo(query);
  }
  @Get('prompt-to-create-and-edit/schedule')
  promptToCreateAndEditSchedule(
    @Query('anoLectivo') anoLectivo: number
  ) {
    return this.promptToCreateAndEditService.promptToCreateAndEditSchedule(anoLectivo);
  }
  @Get('prompt-to-create-and-edit/exam')
  @ApiQuery({
    name: 'anoLectivo',
    type: Number,
    required: true,
    description: 'Ano Lectivo (ex: 23)',
  })
  @ApiQuery({
    name: 'semestre',
    type: Number,
    required: false,
    description: 'Semestre (1 ou 2), opcional',
  })
  @ApiQuery({
    name: 'typeAvaliation',
    type: String,
    required: false,
    enum: [TypeAvaliation.PRIMEIRA_FREQUENCIA, TypeAvaliation.SEGUNDA_FREQUENCIA, TypeAvaliation.PRATICA, TypeAvaliation.NOTA_AVALIACAO_CONTINUA, TypeAvaliation.EXAME, TypeAvaliation.RECURSO, TypeAvaliation.PROVA_ORAL, TypeAvaliation.EPOCA_ESPECIAL, TypeAvaliation.NOTA_FINAL_CALCULADA, TypeAvaliation.NOTA_FINAL_LANCADA, TypeAvaliation.LANCAR_PRIMEIRA_FREQUENCIA, TypeAvaliation.PROVA_ORAL_RECURSO, TypeAvaliation.MELHORIA_NOTAS, TypeAvaliation.SEGUNDA_FREQUENCIA_EXAME],
    description: 'Sigla do tipo de avaliação (ex: 1F, E, R), opcional',

  })
  promptToCreateAnExam(
    @Query('anoLectivo') anoLectivo: number,
    @Query('semestre') semestre?: number,
    @Query('typeAvaliation') typeAvaliation?: string
  ) {
    return this.promptToCreateAndEditService.promptToCreateAnExam(anoLectivo, semestre, typeAvaliation as TypeAvaliation);
  }
  @Get('prompt-to-create-and-edit/pauta')
  @ApiQuery({
    name: 'anoLectivo',
    type: Number,
    required: true,
    description: 'Ano Lectivo (ex: 23)',
  })
  @ApiQuery({
    name: 'semestre',
    type: Number,
    required: false,
    description: 'Semestre (1 ou 2), opcional',
  })
  @ApiQuery({
    name: 'typeAvaliation',
    type: String,
    required: false,
    enum: [TypeAvaliation.PRIMEIRA_FREQUENCIA, TypeAvaliation.SEGUNDA_FREQUENCIA, TypeAvaliation.PRATICA, TypeAvaliation.NOTA_AVALIACAO_CONTINUA, TypeAvaliation.EXAME, TypeAvaliation.RECURSO, TypeAvaliation.PROVA_ORAL, TypeAvaliation.EPOCA_ESPECIAL, TypeAvaliation.NOTA_FINAL_CALCULADA, TypeAvaliation.NOTA_FINAL_LANCADA, TypeAvaliation.LANCAR_PRIMEIRA_FREQUENCIA, TypeAvaliation.PROVA_ORAL_RECURSO, TypeAvaliation.MELHORIA_NOTAS, TypeAvaliation.SEGUNDA_FREQUENCIA_EXAME],
    description: 'Sigla do tipo de avaliação (ex: 1F, E, R), opcional',

  })
  async promptToCreateAndEditPauta(
    @Query('anoLectivo') anoLectivo: number,
    @Query('semestre') semestre?: number,
    @Query('typeAvaliation') typeAvaliation?: string
  ) {
    return this.promptToCreateAndEditService.promptToCreateAndEditPauta(anoLectivo, semestre, typeAvaliation as TypeAvaliation);
  }
  @Get('prompt-to-create-and-edit/grades')
    @ApiQuery({
    name: 'anoLectivo',
    type: Number,
    required: true,
    description: 'Ano Lectivo (ex: 23)',
  })
  @ApiQuery({
    name: 'semestre',
    type: Number,
    required: false,
    description: 'Semestre (1 ou 2), opcional',
  })
  @ApiQuery({
    name: 'typeAvaliation',
    type: String,
    required: false,
    enum: [TypeAvaliation.PRIMEIRA_FREQUENCIA, TypeAvaliation.SEGUNDA_FREQUENCIA, TypeAvaliation.PRATICA, TypeAvaliation.NOTA_AVALIACAO_CONTINUA, TypeAvaliation.EXAME, TypeAvaliation.RECURSO, TypeAvaliation.PROVA_ORAL, TypeAvaliation.EPOCA_ESPECIAL, TypeAvaliation.NOTA_FINAL_CALCULADA, TypeAvaliation.NOTA_FINAL_LANCADA, TypeAvaliation.LANCAR_PRIMEIRA_FREQUENCIA, TypeAvaliation.PROVA_ORAL_RECURSO, TypeAvaliation.MELHORIA_NOTAS, TypeAvaliation.SEGUNDA_FREQUENCIA_EXAME],
    description: 'Sigla do tipo de avaliação (ex: 1F, E, R), opcional',

  })
  promptToCreateAndEditGrades(
    @Query('anoLectivo') anoLectivo: number,
    @Query('semestre') semestre?: number,
    @Query('typeAvaliation') typeAvaliation?: string
  ) {
    return this.promptToCreateAndEditService.promptToCreateAndEditGrades(anoLectivo, semestre, typeAvaliation as TypeAvaliation);
  }


}
