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
import { promptToCreateAndEditService } from './prompt-to-create-and-edit.service';

//@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('academic-activities')
export class AcademicActivitiesController {
  constructor(
    private readonly academicActivitiesService: AcademicActivitiesService,
    private readonly promptToCreateAndEditService: promptToCreateAndEditService,
  ) {}

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.academicActivitiesService.deleteAcademicActivities(+id);
  }
  @Get('marcacao-prova-prazo')
  async getAllPauta(@Query() query: FindMarcacaoPrazoDTO) {
    return this.academicActivitiesService.findMarcacaoProvaPrazo(query);
  }
  @Get('prompt-to-create-and-edit/schedule')
  promptToCreateAndEditSchedule(
    @Query('anoLectivo') anoLectivo: number
  ) {
    return this.promptToCreateAndEditService.promptToCreateAndEditSchedule(anoLectivo);
  }
  @Get('prompt-to-create-and-edit/exam')
  promptToCreateAnExam(
    @Query('anoLectivo') anoLectivo: number
  ) {
    return this.promptToCreateAndEditService.promptToCreateAnExam(anoLectivo);
  }
  @Get('prompt-to-create-and-edit/pauta')
  promptToCreateAndEditPauta(
    @Query('anoLectivo') anoLectivo: number
  ) {
    return this.promptToCreateAndEditService.promptToCreateAndEditPauta(anoLectivo);
  }
  @Get('prompt-to-create-and-edit/grades')
  promptToCreateAndEditGrades(
    @Query('anoLectivo') anoLectivo: number
  ) {
    return this.promptToCreateAndEditService.promptToCreateAndEditGrades(anoLectivo);
  }
  

}
