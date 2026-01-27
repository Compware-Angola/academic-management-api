import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AcademicActivitiesService } from './academic_activities.service';
import { PermissionsGuard } from '../common/secret/permissions.guard';
import { RemoteJwtAuthGuard } from '../common/guard/remote.jwt-auth.guard';
import { FindMarcacaoPrazoDTO } from './dto/find-marcacao-prova-prazo.dto';

//@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('academic-activities')
export class AcademicActivitiesController {
  constructor(
    private readonly academicActivitiesService: AcademicActivitiesService,
  ) {}

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.academicActivitiesService.deleteAcademicActivities(+id);
  }
  @Get('marcacao-prova-prazo')
  async getAllPauta(@Query() query: FindMarcacaoPrazoDTO) {
    return this.academicActivitiesService.findMarcacaoProvaPrazo(query);
  }
}
