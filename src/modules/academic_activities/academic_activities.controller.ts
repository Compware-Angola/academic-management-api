import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { AcademicActivitiesService } from './academic_activities.service';
import { PermissionsGuard } from '../common/secret/permissions.guard';
import { RemoteJwtAuthGuard } from '../common/guard/remote.jwt-auth.guard';
import { FindMarcacaoPrazoDTO } from './dto/find-marcacao-prova-prazo.dto';
import { promptToCreateAndEditService } from './prompt-to-create-and-edit.service';
import { ApiQuery } from '@nestjs/swagger/dist/decorators/api-query.decorator';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateAcademicActivitiesTermsDto } from './dto/create-academic-activities-terms.dto';
import { AccessLogHelper } from '../common/helpers/access-log.helper';
import { HttpService } from '@nestjs/axios/dist/http.service';
import { FindPrazosMatricula } from './dto/find-prazos-matricula.dto';

@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('academic-activities')
export class AcademicActivitiesController {
  constructor(
    private readonly academicActivitiesService: AcademicActivitiesService,
    private readonly promptToCreateAndEditService: promptToCreateAndEditService,
    private readonly httpService: HttpService,
  ) { }
  @Post('terms')
  @ApiOperation({ summary: 'Criar prazo académico' })
  @ApiResponse({ status: 201, description: 'Prazo criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Erro de validação' })
  async create(@Body() dto: CreateAcademicActivitiesTermsDto, @Req() req: any) {
    const user = req.user;
    const ip =
      req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    this.academicActivitiesService.createAcademicActivitiesTerms(dto, user);
    await AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${user?.nome} Criou Prazo Académico`,
      fkAcesso: 6,
      fkFuncionalidade: 91,
      fkUtilizadorResponsavel: user.sub,
      fkOperacaoLog: 1,
      ip: ip,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.academicActivitiesService.deleteAcademicActivities(+id);
  }
  @Get('prazos-matricula')
  async prazosMatricula(@Query() query: FindPrazosMatricula) {
    return this.academicActivitiesService.prazosMatricula(query);
  }
  @Get('marcacao-prova-prazo')
  async getAllPauta(@Query() query: FindMarcacaoPrazoDTO) {
    return this.academicActivitiesService.findMarcacaoProvaPrazo(query);
  }
  @Get('prompt-to-create-and-edit/schedule')
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
  promptToCreateAndEditSchedule(
    @Query('anoLectivo') anoLectivo: number,
    @Query('semestre') semestre: number,
  ) {
    return this.promptToCreateAndEditService.promptToCreateAndEditSchedule(
      anoLectivo,
      semestre,
    );
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
    type: Number,
    required: false,
    description: 'Sigla do tipo de avaliação (ex: 1F, E, R), opcional',
  })
  promptToCreateAnExam(
    @Query('anoLectivo') anoLectivo: number,
    @Query('semestre') semestre?: number,
    @Query('typeAvaliation') typeAvaliation?: number,
  ) {
    return this.promptToCreateAndEditService.promptToCreateAnExam(
      anoLectivo,
      semestre,
      typeAvaliation,
    );
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
    type: Number,
    required: false,
    description: 'Sigla do tipo de avaliação (ex: 1F, E, R), opcional',
  })
  async promptToCreateAndEditPauta(
    @Query('anoLectivo') anoLectivo: number,
    @Query('semestre') semestre?: number,
    @Query('typeAvaliation') typeAvaliation?: number,
  ) {
    return this.promptToCreateAndEditService.promptToCreateAndEditPauta(
      anoLectivo,
      semestre,
      typeAvaliation,
    );
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
    type: Number,
    required: false,
    description: 'Sigla do tipo de avaliação (ex: 1F, E, R), opcional',
  })
  promptToCreateAndEditGrades(
    @Query('anoLectivo') anoLectivo: number,
    @Query('semestre') semestre?: number,
    @Query('typeAvaliation') typeAvaliation?: number,
  ) {
    return this.promptToCreateAndEditService.promptToCreateAndEditGrades(
      anoLectivo,
      semestre,
      typeAvaliation,
    );
  }
}
