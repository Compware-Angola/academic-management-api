import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PostGraduationService } from './post-graduation.service';
import { FindPrimaryRecordsDto } from './dto/find-primary-records.dto';
import { RemoteJwtAuthGuard } from '../common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from '../common/secret/permissions.guard';
import { PermissionTypeDetails } from '../common/enums/permission.type';
import { RequiredPermissions } from '../common/pipes/permissions.decorator';
import { FindExamCalendarsDto } from './dto/find-exam-calendars.dto';
import { FindCurricularUnitFormulasDto } from './dto/find-curricular-unit-formulas.dto';
import { UpdateCurricularUnitFormulaDto } from './dto/update-curricular-unit-formula.dto';
import { RequestUser } from '../common/types/token-validation-response.interface';
import { FindOralCurricularUnitsDto } from './dto/find-oral-curricular-units.dto';
import { UpdateOralCurricularUnitStatusDto } from './dto/update-oral-curricular-unit-status.dto';

interface AuthenticatedRequest {
  user: RequestUser;
}

@ApiTags('post-graduation')
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('post-graduation')
export class PostGraduationController {
  constructor(
    private readonly postGraduationService: PostGraduationService,
  ) {}

  @Get('degrees')
  @RequiredPermissions(
    PermissionTypeDetails.REGISTRO_PRIMARIO_BD_POS_GRADUACAO.sigla,
    PermissionTypeDetails.CALENDARIO_PROVAS.sigla,
    PermissionTypeDetails.DEFINIR_UNIDADE_CURRICULAR_COM_ORAL.sigla,
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

  @Get('assessments/formulas')
  @RequiredPermissions(
    PermissionTypeDetails.DEFINIR_FORMULA_UNIDADE_CURRICULAR.sigla,
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
    PermissionTypeDetails.DEFINIR_FORMULA_UNIDADE_CURRICULAR.sigla,
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
    PermissionTypeDetails.DEFINIR_UNIDADE_CURRICULAR_COM_ORAL.sigla,
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
    PermissionTypeDetails.DEFINIR_UNIDADE_CURRICULAR_COM_ORAL.sigla,
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
}
