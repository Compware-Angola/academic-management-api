import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DefenseManagementTfcService } from './defense-management-tfc.service';
import { ApiTags, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import {  CreateOrientadorDto, FiltroOrientadorDto, ListFinalistStudentsQueryDto, ListFinalistStudentsResponseDto } from './dto';
import { RemoteJwtAuthGuard } from '../common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from '../common/secret/permissions.guard';
import { RequiredPermissions } from '../common/pipes/permissions.decorator';
import { PermissionTypeDetails } from '../common/enums/permission.type';
import {type Request } from 'express';
import { HttpService } from '@nestjs/axios';
import { AccessLogHelper } from '../common/helpers/access-log.helper';


@ApiTags('defense-management-tfc')
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('defense-management-tfc')

export class DefenseManagementTfcController {
  constructor(private readonly defenseManagementTfcService: DefenseManagementTfcService,private httpService: HttpService) {}
  @RequiredPermissions(
    PermissionTypeDetails.DEFESA.sigla,
  )
  @Get('students')
  @ApiOkResponse({ type:ListFinalistStudentsResponseDto, description: 'Lista de estudantes finalistas' })
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
    return {message: 'Orientador criado com sucesso'};
  }
}
