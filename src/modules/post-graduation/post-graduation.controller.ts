import {
  Controller,
  Get,
  Query,
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
}
