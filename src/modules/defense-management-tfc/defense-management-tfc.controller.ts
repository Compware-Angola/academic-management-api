import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DefenseManagementTfcService } from './defense-management-tfc.service';
import { ApiTags, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import {  ListFinalistStudentsQueryDto, ListFinalistStudentsResponseDto } from './dto';
import { RemoteJwtAuthGuard } from '../common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from '../common/secret/permissions.guard';
import { RequiredPermissions } from '../common/pipes/permissions.decorator';
import { PermissionTypeDetails } from '../common/enums/permission.type';


@ApiTags('defense-management-tfc')
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('defense-management-tfc')

export class DefenseManagementTfcController {
  constructor(private readonly defenseManagementTfcService: DefenseManagementTfcService) {}
  @RequiredPermissions(
    PermissionTypeDetails.DEFESA.sigla,
  )
  @Get('students')
  @ApiOkResponse({ type:ListFinalistStudentsResponseDto, description: 'Lista de estudantes finalistas' })
  async listFinalistStudents(@Query() query: ListFinalistStudentsQueryDto) {
   

    return this.defenseManagementTfcService.listFinalistStudents(query
     
    );
  }
}
