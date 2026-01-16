import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { StudentsService } from './students.service';


@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}
@Get('estatistic/:codigoMatricula')
async getProfile(@Param('codigoMatricula') codigoMatricula: number) {
  return this.studentsService.getProfileEstatistic(codigoMatricula);
}
  @Get('find/sugestoes')
  async sugestoes(@Query('search') search: string) {
    return this.studentsService.getSugestoes(search);
  }
}
