import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DefenseManagementTfcService } from './defense-management-tfc.service';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { VincularOrientadorTemaDto, CreateOrientadorDto, FiltroVinculosDto, FiltroOrientadorDto, ListarAlunosPorOrientadorDto, ListFinalistStudentsQueryDto, ListFinalistStudentsResponseDto, ListDocenteQueryDto } from './dto';
import { RemoteJwtAuthGuard } from '../../common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from '../../common/secret/permissions.guard';
import { RequiredPermissions } from '../../common/pipes/permissions.decorator';
import { PermissionTypeDetails } from '../../common/enums/permission.type';
import { HttpService } from '@nestjs/axios';
import { AccessLogHelper } from '../../common/helpers/access-log.helper';


@ApiTags('defense-management-tfc')
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('defense-management-tfc')

export class DefenseManagementTfcController {
  constructor(private readonly defenseManagementTfcService: DefenseManagementTfcService, private httpService: HttpService) { }
  @RequiredPermissions(
    PermissionTypeDetails.DEFESA.sigla,
  )
  @Get('students')
  @ApiOkResponse({ type: ListFinalistStudentsResponseDto, description: 'Lista de estudantes finalistas' })
  async listFinalistStudents(@Query() query: ListFinalistStudentsQueryDto) {

    return this.defenseManagementTfcService.listFinalistStudents(query

    );
  }

  @RequiredPermissions(
    PermissionTypeDetails.DEFESA.sigla,
  )
  @Get('orientadores')
  async orientadoresTFC(@Query() query: FiltroOrientadorDto) {

    return this.defenseManagementTfcService.orientadoresTFC(query

    );
  }

  @RequiredPermissions(
    PermissionTypeDetails.DEFESA.sigla,
  )
  @Post('orientadores')
  async createOrientador(@Body() orientador: CreateOrientadorDto, @Req() req: any,) {
    const user = req.user;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    await this.defenseManagementTfcService.createOrientador(orientador, user.sub as string);
    AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${user?.nome} Criou Orientador TFC`,
      fkUtilizadorResponsavel: user.sub,
      ip: ip,
    });
    return { message: 'Orientador criado com sucesso' };
  }

  @RequiredPermissions(
    PermissionTypeDetails.DEFESA.sigla,
  )
  @Post('vinculos')
  async vincularOrientadorAoAluno(@Body() orientador: VincularOrientadorTemaDto, @Req() req: any,) {
    const user = req.user;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    await this.defenseManagementTfcService.vincularOrientadorAoAluno(orientador, user.sub as string);
    AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${user?.nome} Vinculou Orientador e Tema ao Aluno`,
      fkUtilizadorResponsavel: user.sub,
      ip: ip,
    });
    return { message: 'Orientador e Tema vinculados com sucesso' };
  }

  @RequiredPermissions(
    PermissionTypeDetails.DEFESA.sigla,
  )
  @Get('orientadores/:orientadorId/alunos')
  async listarAlunosPorOrientador(
    @Param('orientadorId', ParseIntPipe) orientadorId: number,
    @Query('anoLectivoId', ParseIntPipe) anoLectivoId: number) {
    return this.defenseManagementTfcService.listarAlunosPorOrientador({
      orientadorId: orientadorId,
      anoLectivoId: anoLectivoId,
    });
  }

  @Get('vinculos')
  @RequiredPermissions(PermissionTypeDetails.DEFESA.sigla)
  async listarVinculos(@Query() filtros: FiltroVinculosDto) {
    return this.defenseManagementTfcService.listarVinculos(filtros);
  }

  @Get('docentes')
  async listarDocentes(@Query() query: ListDocenteQueryDto) {
    return this.defenseManagementTfcService.listarDocentes(query);
  }

  @Delete('orientadores/:codigo')
  @RequiredPermissions(PermissionTypeDetails.DEFESA.sigla)
  async apagarOrientador(
    @Param('codigo', ParseIntPipe) codigo: number,
    @Body('anoLectivoId', ParseIntPipe) anoLectivoId: number,
    @Req() req: any,
  ) {
    const user = req.user;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    await this.defenseManagementTfcService.apagarOrientador({
      codigo: Number(codigo),
      anoLectivoId: Number(anoLectivoId),
    });

    AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${user?.nome} removeu Orientador TFC e seus vínculos`,
      fkUtilizadorResponsavel: user.sub,
      ip: ip,
    });

    return { message: 'Orientador e vínculos removidos com sucesso.' };
  }

  @Delete('vinculos/:codigo')
  @RequiredPermissions(PermissionTypeDetails.DEFESA.sigla)
  async apagarVinculo(
    @Param('codigo', ParseIntPipe) codigo: number,
    @Req() req: any,
  ) {
    const user = req.user;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    await this.defenseManagementTfcService.removerVinculo(codigo);

    AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${user?.nome} removeu Vínculo de Orientador TFC`,
      fkUtilizadorResponsavel: user.sub,
      ip: ip,
    });

    return { message: 'Vínculo removido com sucesso.' };
  }
}
