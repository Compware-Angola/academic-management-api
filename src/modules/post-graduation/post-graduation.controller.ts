import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PostGraduationService } from './post-graduation.service';
import { FindPrimaryRecordsDto } from './dto/find-primary-records.dto';
import { RemoteJwtAuthGuard } from '../../common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from '../../common/secret/permissions.guard';
import { PermissionTypeDetails } from '../../common/enums/permission.type';
import { RequiredPermissions } from '../../common/pipes/permissions.decorator';
import { FindExamCalendarsDto } from './dto/find-exam-calendars.dto';
import { FindCurricularUnitFormulasDto } from './dto/find-curricular-unit-formulas.dto';
import { UpdateCurricularUnitFormulaDto } from './dto/update-curricular-unit-formula.dto';
import { RequestUser } from '../../common/types/token-validation-response.interface';
import { FindOralCurricularUnitsDto } from './dto/find-oral-curricular-units.dto';
import { UpdateOralCurricularUnitStatusDto } from './dto/update-oral-curricular-unit-status.dto';
import { FindExamMarkingOptionsDto } from './dto/find-exam-marking-options.dto';
import { FindExamMarkingsDto } from './dto/find-exam-markings.dto';
import { CreateExamMarkingDto } from './dto/create-exam-marking.dto';
import { PostGraduationExamMarkingService } from './post-graduation-exam-marking.service';
import { FindAttendanceListDto } from './dto/find-attendance-list.dto';
import { PostGraduationAttendanceListService } from './post-graduation-attendance-list.service';
import { FindNoteLaunchOptionsDto } from './dto/find-note-launch-options.dto';
import { FindNoteLaunchStudentsDto } from './dto/find-note-launch-students.dto';
import { PostGraduationNoteLaunchService } from './post-graduation-note-launch.service';
import { UpsertPostGraduationNotesDto } from './dto/upsert-note-launch.dto';
import { HttpService } from '@nestjs/axios';
import { AccessLogHelper } from '../../common/helpers/access-log.helper';
import { FindAgendaLaunchOptionsDto } from './dto/find-agenda-launch-options.dto';
import { FindAgendaLaunchesDto } from './dto/find-agenda-launches.dto';
import { CreateAgendaLaunchDto } from './dto/create-agenda-launch.dto';
import { PostGraduationAgendaLaunchService } from './post-graduation-agenda-launch.service';
import { FindAgendaValidationOptionsDto } from './dto/find-agenda-validation-options.dto';
import { FindAgendaValidationsDto } from './dto/find-agenda-validations.dto';
import { UpdateAgendaValidationStatusDto } from './dto/update-agenda-validation-status.dto';
import { PostGraduationAgendaValidationService } from './post-graduation-agenda-validation.service';
import { FindMissingAgendaValidationsDto } from './dto/find-missing-agenda-validations.dto';
import { FindPostGraduationVacancyOptionsDto } from './dto/find-vacancy-options.dto';
import { FindPostGraduationVacanciesDto } from './dto/find-vacancies.dto';
import { CreatePostGraduationVacancyDto } from './dto/create-vacancy.dto';
import { UpdatePostGraduationVacancyDto } from './dto/update-vacancy.dto';
import { PostGraduationVacancyService } from './post-graduation-vacancy.service';
import { FindPostGraduationFinalResultsDto } from './dto/find-final-results.dto';
import { PostGraduationFinalResultsService } from './post-graduation-final-results.service';

interface AuthenticatedRequest {
  user: RequestUser;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

@ApiTags('post-graduation')
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('post-graduation')
export class PostGraduationController {
  constructor(
    private readonly postGraduationService: PostGraduationService,
    private readonly examMarkingService: PostGraduationExamMarkingService,
    private readonly attendanceListService: PostGraduationAttendanceListService,
    private readonly noteLaunchService: PostGraduationNoteLaunchService,
    private readonly agendaLaunchService: PostGraduationAgendaLaunchService,
    private readonly agendaValidationService: PostGraduationAgendaValidationService,
    private readonly vacancyService: PostGraduationVacancyService,
    private readonly finalResultsService: PostGraduationFinalResultsService,
    private readonly httpService: HttpService,
  ) { }

  @Get('degrees')
  @RequiredPermissions(
    PermissionTypeDetails.REGISTRO_PRIMARIO_BD_POS_GRADUACAO.sigla,
    PermissionTypeDetails.CALENDARIO_PROVAS.sigla,
    PermissionTypeDetails.DEFINIR_FORMULA_UC_POS_GRADUACAO.sigla,
    PermissionTypeDetails.DEFINIR_UC_ORAL_POS_GRADUACAO.sigla,
    PermissionTypeDetails.MARCAR_PROVA_POS_GRADUACAO.sigla,
    PermissionTypeDetails.LISTA_PRESENCA_POS_GRADUACAO.sigla,
    PermissionTypeDetails.LANCAMENTO_NOTAS_POS_GRADUACAO.sigla,
    PermissionTypeDetails.LANCAMENTO_PAUTA_POS_GRADUACAO.sigla,
    PermissionTypeDetails.VALIDACAO_PAUTA_POS_GRADUACAO.sigla,
    PermissionTypeDetails.DEFINIR_VAGAS_POS_GRADUACAO.sigla,
    PermissionTypeDetails.RESULTADOS_FINAIS_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary: 'Listar graus de Pos-Graduacao',
  })
  @ApiResponse({
    status: 200,
    description: 'Graus de Pos-Graduacao listados com sucesso.',
  })
  findDegrees() {
    return this.postGraduationService.findDegrees();
  }

  @Get('primary-records')
  @RequiredPermissions(
    PermissionTypeDetails.REGISTRO_PRIMARIO_BD_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary: 'Listar registos primarios de estudantes de Pos-Graduacao',
  })
  @ApiResponse({
    status: 200,
    description: 'Registos primarios listados com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Filtros invalidos.',
  })
  @ApiResponse({
    status: 404,
    description: 'Ano lectivo ou tipo de candidatura nao encontrado.',
  })
  findPrimaryRecords(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: FindPrimaryRecordsDto,
  ) {
    return this.postGraduationService.findPrimaryRecords(query);
  }

  @Get('exam-calendars')
  @RequiredPermissions(PermissionTypeDetails.CALENDARIO_PROVAS.sigla)
  @ApiOperation({
    summary: 'Listar calendarios academicos de provas da Pos-Graduacao',
  })
  @ApiResponse({
    status: 200,
    description: 'Calendarios de provas listados com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Filtros invalidos.',
  })
  @ApiResponse({
    status: 404,
    description: 'Ano lectivo ou grau nao encontrado.',
  })
  findExamCalendars(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: FindExamCalendarsDto,
  ) {
    return this.postGraduationService.findExamCalendars(query);
  }

  @Get('vacancies/options')
  @RequiredPermissions(PermissionTypeDetails.DEFINIR_VAGAS_POS_GRADUACAO.sigla)
  @ApiOperation({
    summary: 'Listar cursos e períodos para vagas de Pós-Graduação',
  })
  @ApiResponse({
    status: 200,
    description: 'Opções de vagas retornadas com sucesso.',
  })
  findVacancyOptions(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: FindPostGraduationVacancyOptionsDto,
  ) {
    return this.vacancyService.findOptions(query.degreeId);
  }

  @Get('vacancies')
  @RequiredPermissions(PermissionTypeDetails.DEFINIR_VAGAS_POS_GRADUACAO.sigla)
  @ApiOperation({
    summary: 'Listar vagas de Pós-Graduação e respetiva disponibilidade',
  })
  @ApiResponse({
    status: 200,
    description: 'Vagas de Pós-Graduação retornadas com sucesso.',
  })
  findVacancies(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: FindPostGraduationVacanciesDto,
  ) {
    return this.vacancyService.findAll(query);
  }

  @Get('access-exam/final-results')
  @RequiredPermissions(
    PermissionTypeDetails.RESULTADOS_FINAIS_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary: 'Listar resultados finais do Exame de Acesso da Pós-Graduação',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultados finais retornados com sucesso.',
  })
  @ApiResponse({
    status: 404,
    description: 'Ano lectivo ou grau de Pós-Graduação não encontrado.',
  })
  findFinalResults(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: FindPostGraduationFinalResultsDto,
  ) {
    return this.finalResultsService.findAll(query);
  }

  @Post('vacancies')
  @RequiredPermissions(PermissionTypeDetails.DEFINIR_VAGAS_POS_GRADUACAO.sigla)
  @ApiOperation({
    summary: 'Criar uma vaga de Pós-Graduação',
  })
  @ApiResponse({
    status: 201,
    description: 'Vaga de Pós-Graduação criada com sucesso.',
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe uma vaga para curso, período e ano lectivo.',
  })
  createVacancy(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: CreatePostGraduationVacancyDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.vacancyService.create(body, request.user.sub);
  }

  @Patch('vacancies/:vacancyId')
  @RequiredPermissions(PermissionTypeDetails.DEFINIR_VAGAS_POS_GRADUACAO.sigla)
  @ApiOperation({
    summary: 'Atualizar o número de vagas de Pós-Graduação',
  })
  @ApiResponse({
    status: 200,
    description: 'Número de vagas atualizado com sucesso.',
  })
  @ApiResponse({
    status: 409,
    description: 'Novo total inferior às vagas já ocupadas.',
  })
  updateVacancy(
    @Param('vacancyId', ParseIntPipe) vacancyId: number,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: UpdatePostGraduationVacancyDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.vacancyService.update(vacancyId, body, request.user.sub);
  }

  @Get('assessments/formulas')
  @RequiredPermissions(
    PermissionTypeDetails.DEFINIR_FORMULA_UC_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary: 'Listar formulas das UCs de Pos-Graduacao',
  })
  @ApiResponse({
    status: 200,
    description: 'Formulas das UCs listadas com sucesso.',
  })
  @ApiResponse({
    status: 403,
    description: 'O utilizador nao coordena o curso informado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Curso, ano lectivo ou plano curricular nao encontrado.',
  })
  findCurricularUnitFormulas(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: FindCurricularUnitFormulasDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.postGraduationService.findCurricularUnitFormulas(
      query,
      request.user.sub,
    );
  }

  @Put('assessments/formulas/:formulaId')
  @RequiredPermissions(
    PermissionTypeDetails.DEFINIR_FORMULA_UC_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary: 'Atualizar formula de uma UC de Pos-Graduacao',
  })
  @ApiResponse({
    status: 200,
    description: 'Formula da UC atualizada com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Pesos invalidos.',
  })
  @ApiResponse({
    status: 403,
    description: 'O utilizador nao coordena o curso da UC.',
  })
  @ApiResponse({
    status: 404,
    description: 'Formula de UC de Pos-Graduacao nao encontrada.',
  })
  updateCurricularUnitFormula(
    @Param('formulaId', ParseIntPipe) formulaId: number,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: UpdateCurricularUnitFormulaDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.postGraduationService.updateCurricularUnitFormula(
      formulaId,
      body,
      request.user.sub,
    );
  }

  @Get('assessments/oral-curricular-units')
  @RequiredPermissions(
    PermissionTypeDetails.DEFINIR_UC_ORAL_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary: 'Listar UCs com configuracao de oral da Pos-Graduacao',
  })
  @ApiResponse({
    status: 200,
    description: 'UCs e configuracoes de oral listadas com sucesso.',
  })
  @ApiResponse({
    status: 403,
    description: 'O utilizador nao coordena o curso informado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Curso, ano lectivo ou plano curricular nao encontrado.',
  })
  findOralCurricularUnits(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: FindOralCurricularUnitsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.postGraduationService.findOralCurricularUnits(
      query,
      request.user.sub,
    );
  }

  @Patch('assessments/oral-curricular-units/:curricularGradeId/status')
  @RequiredPermissions(
    PermissionTypeDetails.DEFINIR_UC_ORAL_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary: 'Habilitar ou desabilitar oral numa UC de Pos-Graduacao',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuracao de oral atualizada com sucesso.',
  })
  @ApiResponse({
    status: 403,
    description: 'O utilizador nao coordena o curso da UC.',
  })
  @ApiResponse({
    status: 404,
    description: 'Grade curricular de Pos-Graduacao nao encontrada.',
  })
  updateOralCurricularUnitStatus(
    @Param('curricularGradeId', ParseIntPipe) curricularGradeId: number,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: UpdateOralCurricularUnitStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.postGraduationService.updateOralCurricularUnitStatus(
      curricularGradeId,
      body,
      request.user.sub,
    );
  }

  @Get('assessments/exam-markings/options')
  @RequiredPermissions(
    PermissionTypeDetails.MARCAR_PROVA_POS_GRADUACAO.sigla,
    PermissionTypeDetails.LISTA_PRESENCA_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary: 'Listar opcoes de marcacao de provas permitidas ao docente',
  })
  findExamMarkingOptions(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: FindExamMarkingOptionsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.examMarkingService.findOptions(query, request.user.sub);
  }

  @Get('assessments/exam-markings')
  @RequiredPermissions(
    PermissionTypeDetails.MARCAR_PROVA_POS_GRADUACAO.sigla,
    PermissionTypeDetails.LISTA_PRESENCA_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary: 'Listar provas de Pos-Graduacao marcadas pelo docente',
  })
  findExamMarkings(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: FindExamMarkingsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.examMarkingService.findAll(query, request.user.sub);
  }

  @Post('assessments/exam-markings')
  @RequiredPermissions(PermissionTypeDetails.MARCAR_PROVA_POS_GRADUACAO.sigla)
  @ApiOperation({
    summary: 'Marcar uma prova de Pos-Graduacao',
  })
  @ApiResponse({
    status: 201,
    description: 'Prova de Pos-Graduacao marcada com sucesso.',
  })
  @ApiResponse({
    status: 409,
    description: 'Prova duplicada ou conflito de sala/docente/vigilante.',
  })
  createExamMarking(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: CreateExamMarkingDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.examMarkingService.create(body, request.user.sub);
  }

  @Get('assessments/attendance-list')
  @RequiredPermissions(PermissionTypeDetails.LISTA_PRESENCA_POS_GRADUACAO.sigla)
  @ApiOperation({
    summary: 'Listar estudantes elegiveis para presenca na Pos-Graduacao',
    description:
      'Aplica somente criterios academicos. Pagamentos, bolsas e mensalidades nao interferem na lista.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de presenca retornada com sucesso.',
  })
  @ApiResponse({
    status: 404,
    description: 'Contexto academico de Pos-Graduacao nao encontrado.',
  })
  findAttendanceList(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: FindAttendanceListDto,
  ) {
    return this.attendanceListService.findAll(query);
  }

  @Get('assessments/note-launch/options')
  @RequiredPermissions(
    PermissionTypeDetails.LANCAMENTO_NOTAS_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary:
      'Listar opcoes de lancamento de notas da Pos-Graduacao permitidas ao docente',
  })
  @ApiResponse({
    status: 200,
    description: 'Opcoes de lancamento de notas retornadas com sucesso.',
  })
  findNoteLaunchOptions(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: FindNoteLaunchOptionsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.noteLaunchService.findOptions(query, request.user.sub);
  }

  @Get('assessments/note-launch/students')
  @RequiredPermissions(
    PermissionTypeDetails.LANCAMENTO_NOTAS_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary:
      'Listar estudantes e notas existentes para lancamento na Pos-Graduacao',
  })
  @ApiResponse({
    status: 200,
    description: 'Estudantes e notas existentes retornados com sucesso.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Contexto de lancamento de notas da Pos-Graduacao nao encontrado.',
  })
  findNoteLaunchStudents(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: FindNoteLaunchStudentsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.noteLaunchService.findStudents(query, request.user.sub);
  }

  @Put('assessments/note-launch')
  @RequiredPermissions(
    PermissionTypeDetails.LANCAMENTO_NOTAS_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary: 'Criar ou atualizar notas da Pós-Graduação',
  })
  async upsertPostGraduationNotes(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: UpsertPostGraduationNotesDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const result = await this.noteLaunchService.upsertNotes(body, request.user);

    AccessLogHelper.logAccess(this.httpService, {
      descricao:
        `Lançamento de ${body.items.length} nota(s) da Pós-Graduação` +
        ` | Tipo Avaliação: ${body.assessmentTypeId}` +
        ` | Época: ${body.termId}`,
      fkAcesso: 7,
      fkUtilizadorResponsavel: request.user.sub,
      ip: request.ip ?? String(request.headers['x-forwarded-for'] ?? 'unknown'),
    });

    return result;
  }

  @Get('assessments/agenda-launch/options')
  @RequiredPermissions(
    PermissionTypeDetails.LANCAMENTO_PAUTA_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary:
      'Listar opcoes de lancamento de pauta da Pos-Graduacao permitidas ao docente',
  })
  @ApiResponse({
    status: 200,
    description: 'Opcoes de lancamento de pauta retornadas com sucesso.',
  })
  findAgendaLaunchOptions(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: FindAgendaLaunchOptionsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.agendaLaunchService.findOptions(query, request.user.sub);
  }

  @Get('assessments/agenda-launch')
  @RequiredPermissions(
    PermissionTypeDetails.LANCAMENTO_PAUTA_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary: 'Listar pautas de Pos-Graduacao lancadas pelo docente',
  })
  @ApiResponse({
    status: 200,
    description: 'Pautas de Pos-Graduacao retornadas com sucesso.',
  })
  findAgendaLaunches(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: FindAgendaLaunchesDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.agendaLaunchService.findAll(query, request.user.sub);
  }

  @Post('assessments/agenda-launch')
  @RequiredPermissions(
    PermissionTypeDetails.LANCAMENTO_PAUTA_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary: 'Registar uma pauta de Pos-Graduacao',
  })
  @ApiResponse({
    status: 201,
    description: 'Pauta de Pos-Graduacao registada com sucesso.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Ja existe uma pauta activa para a UC e tipo de avaliacao informados.',
  })
  async createAgendaLaunch(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: CreateAgendaLaunchDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const result = await this.agendaLaunchService.create(
      body,
      request.user.sub,
    );

    AccessLogHelper.logAccess(this.httpService, {
      descricao:
        'Lançamento de pauta da Pós-Graduação' +
        ` | Grade curricular: ${body.curricularGradeId}` +
        ` | Tipo de avaliação: ${body.assessmentTypeId}`,
      fkAcesso: 7,
      fkUtilizadorResponsavel: request.user.sub,
      ip: request.ip ?? String(request.headers['x-forwarded-for'] ?? 'unknown'),
    });

    return result;
  }

  @Get('assessments/agenda-validation/options')
  @RequiredPermissions(
    PermissionTypeDetails.VALIDACAO_PAUTA_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary:
      'Listar opcoes de validacao de pauta permitidas ao coordenador de Pos-Graduacao',
  })
  @ApiResponse({
    status: 200,
    description: 'Opcoes de validacao retornadas com sucesso.',
  })
  findAgendaValidationOptions(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: FindAgendaValidationOptionsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.agendaValidationService.findOptions(query, request.user.sub);
  }

  @Get('assessments/agenda-validation')
  @RequiredPermissions(
    PermissionTypeDetails.VALIDACAO_PAUTA_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary:
      'Listar pautas de Pos-Graduacao submetidas nos cursos coordenados pelo utilizador',
  })
  @ApiResponse({
    status: 200,
    description: 'Pautas submetidas retornadas com sucesso.',
  })
  findAgendaValidations(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: FindAgendaValidationsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.agendaValidationService.findAll(query, request.user.sub);
  }

  @Get('assessments/agenda-validation/missing')
  @RequiredPermissions(
    PermissionTypeDetails.VALIDACAO_PAUTA_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary:
      'Listar UCs de Pos-Graduacao sem pauta nos cursos coordenados pelo utilizador',
  })
  @ApiResponse({
    status: 200,
    description: 'UCs sem pauta retornadas com sucesso.',
  })
  findMissingAgendaValidations(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: FindMissingAgendaValidationsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.agendaValidationService.findMissing(query, request.user.sub);
  }

  @Patch('assessments/agenda-validation/:agendaId/status')
  @RequiredPermissions(
    PermissionTypeDetails.VALIDACAO_PAUTA_POS_GRADUACAO.sigla,
  )
  @ApiOperation({
    summary: 'Aprovar ou rejeitar uma pauta de Pos-Graduacao',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado da pauta atualizado com sucesso.',
  })
  @ApiResponse({
    status: 403,
    description: 'O utilizador nao coordena o curso da pauta.',
  })
  @ApiResponse({
    status: 404,
    description: 'Pauta activa de Pos-Graduacao nao encontrada.',
  })
  async updateAgendaValidationStatus(
    @Param('agendaId', ParseIntPipe) agendaId: number,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: UpdateAgendaValidationStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const result = await this.agendaValidationService.updateStatus(
      agendaId,
      body,
      request.user.sub,
    );

    AccessLogHelper.logAccess(this.httpService, {
      descricao:
        `${body.statusId === 2 ? 'Aprovação' : 'Rejeição'} de pauta da Pós-Graduação` +
        ` | Pauta: ${agendaId}`,
      fkAcesso: 7,
      fkUtilizadorResponsavel: request.user.sub,
      ip: request.ip ?? String(request.headers['x-forwarded-for'] ?? 'unknown'),
    });

    return result;
  }
}
