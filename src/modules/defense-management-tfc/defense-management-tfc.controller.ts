import { Controller, Get, Query } from '@nestjs/common';
import { DefenseManagementTfcService } from './defense-management-tfc.service';
import { ApiTags, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { FinalistStudentDto, ListFinalistStudentsQueryDto, ListFinalistStudentsResponseDto } from './dto';


@ApiTags('defense-management-tfc')
@Controller('defense-management-tfc')
export class DefenseManagementTfcController {
  constructor(private readonly defenseManagementTfcService: DefenseManagementTfcService) {}

  @Get('students')
  @ApiOkResponse({ type:ListFinalistStudentsResponseDto, description: 'Lista de estudantes finalistas' })
  async listFinalistStudents(@Query() query: ListFinalistStudentsQueryDto) {
   

    return this.defenseManagementTfcService.listFinalistStudents(query
     
    );
  }
}
