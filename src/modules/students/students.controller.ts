import {
  Controller,
  Get,
  Body,
  Param,
  Query,
  ValidationPipe,
  Put,
  UsePipes,
  HttpStatus,
  UseGuards,
  Req,
  Patch,
  Post,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { FilterMapaAnualFinalistasDto } from './dto/filter-mapa-anual-finalista.dto';
import { FilterRegistoPrimarioExamesAcessoDto } from './dto/filter-registo-primario-exames-acesso.dto';
import { FilterRegistoPrimarioMatriculadosDto } from './dto/filter-registo-primario-matriculados.dto';

import {
  FindStudentsDTO,
  ResetStudentPasswordDTO,
  UpdateStudentContactDTO,
  UpdateStudentPersonalDataDTO,
} from './dto/find-students.dto';
import { ActivateRegistrationDTO } from './dto/activate-registration.dto';

import { PermissionsGuard } from '../../common/secret/permissions.guard';
import { RemoteJwtAuthGuard } from '../../common/guard/remote.jwt-auth.guard';
import { InactivateRegistrationDTO } from './dto/inactivate-registration.dto';

import { AcademicHistoryDTO } from './dto/academic-history';
import { ChangeCourseDTO } from './dto/change-course.dto';

import { StudentNoteService } from './sudents-notes.service';
import { FindStudentNoteDTO } from './dto/find-student-notes.dto';
import { CreateStudentEnrollmentUC } from './dto/create-student-enrollment-uc';
import { StudentsEnrollmentUCService } from './students-enrollment-uc.service';
import { FindPendentUCDTO } from './dto/find-pendent-uc.dto';
import { StudentsEnrollmentPendentUCService } from './students-pendent-uc.service';
import { AcademicHistoryEquivalenciaDTO } from './dto/academic-history-equivalencia.dto';
import { AcademicHistoryMigracaoDadosDTO } from './dto/academic-history-migracao.dto';
import { UpdateGradeCurricularAlunoHorarioDTO } from '../discipline/dto/update-grade-curri-curricular-aluno-horario';
import { FindStudentClassInfoDTO } from './dto/find-student-info.dto';

import { DefinirEspecialidadeDTO } from './dto/definir-especialidade.dto';

import { DiplomarAlunoDTO } from './dto/diplomar-aluno.dto';
import { DesdiplomarAlunoDTO } from './dto/desdiplomar-aluno.dto';
import { GerarDiplomaDTO } from './dto/gerar-diploma.dto';

import { GerarCertificadoDto } from './dto/gerar-certificado.dto';

import { StudentsChangeCourse } from './students-change.course.service';
import { StudentsResultPlanService } from './students-result-plan.service';
import { ListarDiplomadosDTO } from './dto/listar-diplomados-dto';
import { HttpService } from '@nestjs/axios';
import { AccessLogHelper } from '../../common/helpers/access-log.helper';
import { AtiveConfirmationService } from './ative-confirmation.service';
import { RequiredPermissions } from '../../common/pipes/permissions.decorator';
import { PermissionTypeDetails } from '../../common/enums/permission.type';
import { EquivalenceTFCMigration } from './equivalence-tfc-migration.service';
import { CreateEquivalenceTFCMigration } from './dto/create-equivalence-tfc-migration';
import { HangingRailingsAndToBeMadeService } from './hanging_railings_and_to_be_made.service';
import { FindPlanPorClasseDTO } from './dto/FindPlanPorClasseDTO';
import { NextClassDTO } from './dto/next-class';
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@ApiTags('Students')
@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly studentNoteService: StudentNoteService,
    private readonly studentEnrollment: StudentsEnrollmentUCService,
    private readonly studentsEnrollmentPendentUCService: StudentsEnrollmentPendentUCService,
    private readonly studentsChangeCourse: StudentsChangeCourse,
    private readonly studentsResultPlanService: StudentsResultPlanService,
    private readonly ativeConfirmationService: AtiveConfirmationService,
    private readonly equivalenceTFMigration: EquivalenceTFCMigration,
    private readonly hangingRailingsAndToBeMadeService: HangingRailingsAndToBeMadeService,
    private httpService: HttpService,
  ) {}
  private log(req: any, descricao: string) {
    const user = req.user;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    AccessLogHelper.logAccess(this.httpService, {
      descricao,
      fkUtilizadorResponsavel: user?.sub,
      ip,
    });
  }

  @Get('estatistic/:codigoMatricula')
  async getProfile(@Param('codigoMatricula') codigoMatricula: number) {
    return this.studentsService.getProfileEstatistic(codigoMatricula);
  }
  @Get('find/sugestoes')
  async sugestoes(@Query('search') search: string) {
    return this.studentsService.getSugestoes(search);
  }
  @Get()
  @ApiOperation({ summary: 'Listar Estudantes matriculadas' })
  @ApiResponse({
    status: 200,
    description: 'Listar Estudantes matriculadas',
    type: FindStudentsDTO,
  })
  findCadeiras(@Query(ValidationPipe) query: FindStudentsDTO) {
    return this.studentsService.findStudents(query);
  }
  @Get('classe-info')
  @ApiOperation({
    summary: 'Buscar classe e informações do estudante',
    description:
      'Retorna a classe com maior número de grades curriculares inscritas e os dados do estudante para um determinado ano lectivo',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do estudante e classe retornados com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Estudante não encontrado',
  })
  async findStudentClassInfo(
    @Query(ValidationPipe) filters: FindStudentClassInfoDTO,
  ) {
    return this.studentsService.findStudentClassInfo(filters);
  }
  @Get('mapa-anual-finalistas')
  @ApiOperation({ summary: 'Mapa anual de estudantes finalistas' })
  @ApiResponse({ status: 200 })
  async listarMapaAnualFinalistas(
    @Query() filter: FilterMapaAnualFinalistasDto,
  ) {
    return this.studentsService.listarMapaAnualFinalistas(filter);
  }

  @Get('registo-primario-exames-acesso')
  @ApiOperation({ summary: 'Listar registo primário de exames de acesso' })
  @ApiResponse({ status: 200 })
  async listarRegistoPrimarioExamesAcesso(
    @Query() filter: FilterRegistoPrimarioExamesAcessoDto,
  ) {
    return this.studentsService.listarRegistoPrimarioExamesAcesso(filter);
  }

  @Get('registo-primario-matriculados')
  @ApiOperation({ summary: 'Listar registo primário de matriculados' })
  @ApiResponse({ status: 200 })
  async listarRegistoPrimarioMatriculados(
    @Query() filter: FilterRegistoPrimarioMatriculadosDto,
  ) {
    return this.studentsService.listarRegistoPrimarioMatriculados(filter);
  }

  @Put('reset-password')
  @ApiOperation({ summary: 'Resetar senha do estudante' })
  @ApiResponse({
    status: 200,
    description: 'Senha do estudante resetada com sucesso',
    type: ResetStudentPasswordDTO,
  })
  async resetPassword(
    @Body(ValidationPipe) body: ResetStudentPasswordDTO,
    @Req() req: any,
  ) {
    console.log({ user: req.user });
    const result = await this.studentsService.resetPassword(body);
    this.log(
      req,
      `Utilizador ${req.user?.nome} resetou a senha do estudante com o codigo de matricula ${body.codigoMatricula}`,
    );
    return result;
  }

  @Put('contactos')
  async updateContactos(
    @Body(ValidationPipe) body: UpdateStudentContactDTO,
    @Req() req: any,
  ) {
    const result = await this.studentsService.updateContactos(body);
    this.log(
      req,
      `Utilizador ${req.user?.nome} atualizou contactos do estudante com codigo de matriula ${body.codigoMatricula}`,
    );
    return result;
  }

  @Put('change-course')
  async changeCourse(
    @Body(ValidationPipe) body: ChangeCourseDTO,
    @Req() req: any,
  ) {
    const result = await this.studentsService.changeCourse(body);

    this.log(
      req,
      `Utilizador ${req.user?.nome} alterou o curso do estudante com codigo de matricula ${body.matriculaId}`,
    );

    return result;
  }

  @Put('personal-data')
  async updatePersonalData(
    @Body(ValidationPipe) body: UpdateStudentPersonalDataDTO,
    @Req() req: any,
  ) {
    const result = await this.studentsService.updatePersonalData(body);

    this.log(
      req,
      `Utilizador ${req.user?.nome} atualizou dados pessoais do estudante como o codigo de matricula ${body.codigoMatricula}`,
    );

    return result;
  }

  @Put('active-registration')
  async ativarMatricula(@Body() dto: ActivateRegistrationDTO, @Req() req: any) {
    const result = await this.studentsService.activateRegistration(
      dto,
      req.user,
    );

    this.log(
      req,
      `Utilizador ${req.user?.nome} ativou matrícula do estudante com o codigo de matricula ${dto.codigoMatricula}`,
    );

    return result;
  }

  @Put('inactivate-registration')
  @RequiredPermissions(PermissionTypeDetails.INATIVAR_MATRICULA.sigla)
  async inativarMatricula(
    @Body(ValidationPipe) dto: InactivateRegistrationDTO,
    @Req() req: any,
  ) {
    const result = await this.studentsService.inactivateRegistration(dto);

    this.log(
      req,
      `Utilizador ${req.user?.nome} inativou matrícula do estudante com o codigo de matricula ${dto.codigoMatricula}`,
    );

    return result;
  }

  @Put('acitve-confirmation/:codigoMatricula')
  async activarConfirmacao(
    @Param('codigoMatricula') codigoMatricula: number,
    @Req() req: any,
  ) {
    const result =
      await this.ativeConfirmationService.activeConfirmation(codigoMatricula);
    this.log(
      req,
      `Utilizador ${req.user?.nome} Ativou a confirmação do estudante com o codigo de matricula ${codigoMatricula}`,
    );
    return result;
  }

  @Get('academic-history')
  @ApiOperation({ summary: 'Obter histórico acadêmico do estudante' })
  @ApiResponse({
    status: 200,
    description: 'Histórico acadêmico do estudante obtido com sucesso',
    type: AcademicHistoryDTO,
  })
  academicHistory(@Query(ValidationPipe) query: AcademicHistoryDTO) {
    return this.studentsService.academicHistory(query);
  }

  @Get('notes')
  @ApiOperation({ summary: 'Listar Notas de Estudantes matriculadas' })
  @ApiResponse({
    status: 200,
    description: 'Listar  Notas de Estudantes matriculadas',
    type: FindStudentsDTO,
  })
  findStudentNotes(@Query(ValidationPipe) query: FindStudentNoteDTO) {
    return this.studentNoteService.findAll(query);
  }

  @Post('/enrollment/uc')
  async createEnrollmentUc(
    @Body(ValidationPipe) body: CreateStudentEnrollmentUC,
    @Req() req: any,
  ) {
    const result = await this.studentEnrollment.enrollmentUc(body);

    this.log(
      req,
      `Utilizador ${req.user?.nome} inscreveu estudante com o codigo de matricula ${body.codigoMatricula} em UC`,
    );

    return result;
  }

  @Get('/enrollment/pendent-uc')
  @ApiOperation({ summary: 'Listar Uc pendentes de um estudante' })
  @ApiResponse({
    status: 200,
    description: 'Listar Uc pendentes de um estudante',
    type: FindPendentUCDTO,
  })
  findPendetUc(@Query(ValidationPipe) query: FindPendentUCDTO) {
    return this.studentsEnrollmentPendentUCService.findPendent(query);
  }

  @Get('academic-history-equivalencia')
  @ApiOperation({ summary: 'Obter histórico acadêmico do estudante' })
  @ApiResponse({
    status: 200,
    description: 'Histórico acadêmico do estudante obtido com sucesso',
  })
  academicHistoryEquivalencia(
    @Query(ValidationPipe) query: AcademicHistoryEquivalenciaDTO,
  ) {
    return this.studentsService.academicHistoryEquivalencia(query);
  }

  @Get('academic-history-migracao-dados')
  @ApiOperation({ summary: 'Obter histórico acadêmico do estudante' })
  @ApiResponse({
    status: 200,
    description: 'Histórico acadêmico do estudante obtido com sucesso',
  })
  academicHistoryMigracaoDados(
    @Query(ValidationPipe) query: AcademicHistoryMigracaoDadosDTO,
  ) {
    return this.studentsService.academicHistoryMigracaoDados(query);
  }

  @Put('horario-grade-curricular')
  @ApiOperation({ summary: 'Atualizar horário da grade curricular' })
  @ApiResponse({
    status: 200,
    description: 'Horário da grade curricular atualizado com sucesso',
  })
  async updateHorarioGradeCurricular(
    @Body(ValidationPipe) body: UpdateGradeCurricularAlunoHorarioDTO,
    @Req() req: any,
  ) {
    const result =
      await this.studentsService.updateHorarioGradeCurricular(body);

    this.log(
      req,
      `Utilizador ${req.user?.nome} atualizou horário da grade curricular do estudante`,
    );

    return result;
  }

  @Delete('grade-curricular/:codigoGradeCurricularAluno')
  async deleteGrade(
    @Param('codigoGradeCurricularAluno', ParseIntPipe)
    codigoGradeCurricularAluno: number,
    @Req() req: any,
  ) {
    const result = await this.studentsService.deleteGrade({
      codigoGradeCurricularAluno,
    });
    this.log(
      req,
      `Utilizador ${req.user?.nome} removeu grade curricular do Aluno com ID ${codigoGradeCurricularAluno}`,
    );
    return result;
  }

  @Put('restore-grade-curricular/:codigoGradeCurricularAluno')
  @ApiOperation({ summary: 'Restaurar grade curricular' })
  @ApiResponse({
    status: 200,
    description: 'Grade curricular restaurada com sucesso',
  })
  async restoreGrade(
    @Param('codigoGradeCurricularAluno', ParseIntPipe)
    codigoGradeCurricularAluno: number,
    @Req() req: any,
  ) {
    const result = await this.studentsService.restoreGrade({
      codigoGradeCurricularAluno,
    });

    this.log(
      req,
      `Utilizador ${req.user?.nome} restaurou grade curricular ${codigoGradeCurricularAluno}`,
    );

    return result;
  }

  @Put('definir-especialidade')
  @ApiOperation({ summary: 'Definir especialidade do estudante' })
  @ApiResponse({
    status: 200,
    description: 'Especialidade do estudante definida com sucesso',
  })
  async definirEspecialidade(
    @Body(ValidationPipe) body: DefinirEspecialidadeDTO,
    @Req() req: any,
  ) {
    const result = await this.studentsService.definirEspecialidade(body);

    this.log(
      req,
      `Utilizador ${req.user?.nome} definiu especialidade do estudante com codigo de matricula ${body.codigoMatricula}`,
    );

    return result;
  }

  @Put('diplomar')
  async diplomarAluno(@Body() dto: DiplomarAlunoDTO, @Req() req: any) {
    const result = await this.studentsService.diplomarAluno(dto, req.user);

    this.log(
      req,
      `Utilizador ${req.user?.nome} diplomou estudante com codigo de matricula ${dto.codigoMatricula}`,
    );

    return result;
  }

  @Put('desdiplomar')
  @RequiredPermissions(PermissionTypeDetails.DIPLOMAR.sigla)
  async desdiplomarAluno(
    @Body(ValidationPipe) dto: DesdiplomarAlunoDTO,
    @Req() req: any,
  ) {
    const result = await this.studentsService.desdiplomarAluno(dto, req.user);

    this.log(
      req,
      `Utilizador ${req.user?.nome} anulou diploma do estudante com codigo de matricula ${dto.codigoMatricula}`,
    );

    return result;
  }

  @Post('gerar-diploma')
  async gerarDiploma(@Body() dto: GerarDiplomaDTO, @Req() req: any) {
    const result = await this.studentsService.gerarDiploma(dto);

    this.log(
      req,
      `Utilizador ${req.user?.nome} gerou diploma do estudante com codigo de matricula ${dto.codigoMatricula}`,
    );

    return result;
  }

  @Get('notas-certificado')
  @ApiOperation({ summary: 'Obter notas do estudante para certificado' })
  @ApiResponse({
    status: 200,
    description: 'Notas do estudante obtidas com sucesso',
  })
  obterNotasCertificado(@Query(ValidationPipe) query: GerarCertificadoDto) {
    return this.studentsService.obterNotasCertificado(query);
  }

  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @Put('mudar-curso')
  async updateCurso(
    @Body(ValidationPipe) body: ChangeCourseDTO,
    @Req() req: any,
  ) {
    const result = await this.studentsChangeCourse.mudarCurso(
      req.user.sub,
      body,
    );

    this.log(
      req,
      `Utilizador ${req.user?.nome} executou mudança de curso do estudante com codigo de matricula ${body.matriculaId}`,
    );

    return result;
  }

  @Get('diplomados')
  @ApiOperation({ summary: 'Listar estudantes diplomados' })
  @ApiQuery({ name: 'anoLectivo', required: true, type: Number })
  @ApiQuery({ name: 'codigoCurso', required: false, type: Number })
  @ApiQuery({
    name: 'genero',
    required: false,
    enum: ['todos', 'Masculino', 'Feminino'],
  })
  @ApiQuery({ name: 'tipoCandidatura', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de estudantes diplomados obtida com sucesso',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  listarEstudantesDiplomados(@Query() query: ListarDiplomadosDTO) {
    return this.studentsService.listarEstudantesDiplomados(query);
  }
  @Get('resultado-plano/:matricula')
  @ApiOperation({ summary: 'Obter histórico acadêmico do estudante' })
  @ApiResponse({
    status: 200,
    description: 'Histórico acadêmico do estudante obtido com sucesso',
  })
  findResultadoPlano(@Param('matricula', ParseIntPipe) matricula: number) {
    return this.studentsResultPlanService.findPlan(matricula);
  }

  @Get('equivalence-migration-tfc/:matricula')
  @ApiOperation({ summary: 'Obter notas equivalencia' })
  @ApiResponse({
    status: 200,
    description: 'Histórico acadêmico do estudante obtido com sucesso',
  })
  findMigrationNote(@Param('matricula', ParseIntPipe) matricula: number) {
    return this.equivalenceTFMigration.findAll(matricula);
  }

  @Delete('equivalence-migration-tfc/:codigoGradeAluno')
  @ApiOperation({ summary: 'Obter notas equivalencia' })
  @ApiResponse({
    status: 200,
    description: 'Histórico acadêmico do estudante obtido com sucesso',
  })
  async deleteMigration(
    @Param('codigoGradeAluno', ParseIntPipe) codigoGradeAluno: number,
    @Req() req: any,
  ) {
    await this.equivalenceTFMigration.delete(codigoGradeAluno);
    this.log(
      req,
      `Utilizador ${req.user?.nome} eliminou a grade curricular do aluno ${codigoGradeAluno} `,
    );
  }
  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @Post('equivalence-migration-tfc')
  async launchNotes(
    @Body(ValidationPipe) body: CreateEquivalenceTFCMigration,
    @Req() req: any,
  ) {
    await this.equivalenceTFMigration.saveAll(req.user.sub, body);
    this.log(
      req,
      `Utilizador ${req.user?.nome} lançou nota finais do estudante ${body.matriculaId} `,
    );
  }

  @Get('next-class/:matricula')
  @ApiOperation({ summary: 'Obter proxima classe do estudante' })
  @ApiQuery({ name: 'anoLectivo', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Proxima classe do estudante obtida com sucesso',
  })
  async getNextClass(
    @Param('matricula', ParseIntPipe) matricula: number,
    @Query(ValidationPipe) query: NextClassDTO,
  ) {
    return this.hangingRailingsAndToBeMadeService.getNextClass(
      matricula,
      query.anoLectivo,
    );
  }

  @Get('hanging-railings-and-to-be-made')
  async findHangingRailingsAndToBeMade(
    @Query(ValidationPipe) query: FindPlanPorClasseDTO,
  ) {
    return this.hangingRailingsAndToBeMadeService.findHangingRailingsAndToBeMade(
      query,
    );
  }
}
