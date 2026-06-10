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

@ApiTags('post-graduation')
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('post-graduation')
export class PostGraduationController {
  constructor(
    private readonly postGraduationService: PostGraduationService,
  ) {}

  @Get('primary-records')
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
