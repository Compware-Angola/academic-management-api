import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { AcademicActivitiesService } from './academic_activities.service';
import { PermissionsGuard } from '../../common/secret/permissions.guard';
import { RemoteJwtAuthGuard } from '../../common/guard/remote.jwt-auth.guard';
import { FindMarcacaoPrazoDTO } from './dto/find-marcacao-prova-prazo.dto';
import { promptToCreateAndEditService } from './prompt-to-create-and-edit.service';
import { ApiQuery } from '@nestjs/swagger/dist/decorators/api-query.decorator';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateAcademicActivitiesTermsDto } from './dto/create-academic-activities-terms.dto';
import { AccessLogHelper } from '../../common/helpers/access-log.helper';
import { HttpService } from '@nestjs/axios/dist/http.service';
import { FindPrazosMatricula } from './dto/find-prazos-matricula.dto';
import { CreateCalendarActivityDto } from './dto/create-calendar-activity.dto';
import { FindCalendarActivitiesDto } from './dto/find-calendar-activities.dto';
import { FindAcademicActivityTermsDto } from './dto/find-academic-activity-terms.dto';
import { UpdateAcademicActivityTermDto } from './dto/update-academic-activity-term.dto';

@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('academic-activities')
export class AcademicActivitiesController {
  constructor(
    private readonly academicActivitiesService: AcademicActivitiesService,
    private readonly promptToCreateAndEditService: promptToCreateAndEditService,
    private readonly httpService: HttpService,
  ) {}

  @Post('calendar-activities')
  @ApiOperation({ summary: 'Criar atividade lectiva no calendário académico' })
  @ApiResponse({
    status: 201,
    description: 'Atividade lectiva criada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Erro de validação' })
  async createCalendarActivity(
    @Body(ValidationPipe) dto: CreateCalendarActivityDto,
    @Req() req: any,
  ) {
    return this.academicActivitiesService.createCalendarActivity(dto, req.user);
  }

  @Get('calendar-activities')
  @ApiOperation({
    summary: 'Listar atividades lectivas do calendário académico',
  })
  @ApiResponse({
    status: 200,
    description: 'Atividades lectivas listadas com sucesso',
  })
  async findCalendarActivities(
    @Query(new ValidationPipe({ transform: true }))
    query: FindCalendarActivitiesDto,
  ) {
    return this.academicActivitiesService.findCalendarActivities(query);
  }

  @Put('calendar-activities/:codigo')
  @ApiOperation({ summary: 'Editar atividade lectiva do calendário académico' })
  @ApiResponse({
    status: 200,
    description: 'Atividade lectiva editada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Erro de validação' })
  async updateCalendarActivity(
    @Param('codigo', ParseIntPipe) codigo: number,
    @Body(ValidationPipe) dto: CreateCalendarActivityDto,
    @Req() req: any,
  ) {
    return this.academicActivitiesService.updateCalendarActivity(
      codigo,
      dto,
      req.user,
    );
  }

  @Delete('calendar-activities/:codigo')
  @ApiOperation({
    summary: 'Eliminar atividade lectiva do calendário académico',
  })
  @ApiResponse({
    status: 200,
    description: 'Atividade lectiva eliminada com sucesso',
  })
  async deleteCalendarActivity(@Param('codigo', ParseIntPipe) codigo: number) {
    return this.academicActivitiesService.deleteCalendarActivity(codigo);
  }

  @Get('terms')
  @ApiOperation({ summary: 'Listar prazos académicos' })
  @ApiResponse({
    status: 200,
    description: 'Prazos académicos listados com sucesso',
  })
  async findAcademicActivityTerms(
    @Query(new ValidationPipe({ transform: true }))
    query: FindAcademicActivityTermsDto,
  ) {
    return this.academicActivitiesService.findAcademicActivityTerms(query);
  }

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

  @Put('terms/:pkPrazo')
  @ApiOperation({ summary: 'Editar prazo académico' })
  @ApiResponse({
    status: 200,
    description: 'Prazo académico editado com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Erro de validação' })
  async updateAcademicActivityTerm(
    @Param('pkPrazo', ParseIntPipe) pkPrazo: number,
    @Body(new ValidationPipe({ transform: true }))
    dto: UpdateAcademicActivityTermDto,
    @Req() req: any,
  ) {
    return this.academicActivitiesService.updateAcademicActivityTerm(
      pkPrazo,
      dto,
      req.user.sub, // <-- id numérico do utilizador autenticado
    );
  }

  @Delete('terms/:pkPrazo')
  @ApiOperation({ summary: 'Eliminar prazo académico' })
  @ApiResponse({
    status: 200,
    description: 'Prazo académico eliminado com sucesso',
  })
  async deleteAcademicActivityTerm(
    @Param('pkPrazo', ParseIntPipe) pkPrazo: number,
  ) {
    return this.academicActivitiesService.deleteAcademicActivityTerm(pkPrazo);
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
