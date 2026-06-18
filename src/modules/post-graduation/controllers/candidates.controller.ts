import { Controller, Get, Param, Query } from '@nestjs/common';
import { CandidatesService } from '../services/candidates.service';
import { FindCandidatesDto } from '../dto/candidates.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Pos Graduacao - Candidatos')
@Controller('post-graduation/candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get()
  async findCandidates(@Query() query: FindCandidatesDto) {
    return  this.candidatesService.findCandidates(query);
  }

  @Get(':id/documents')
  async findCandidateDocuments(@Param('id') id: string) {
    return  this.candidatesService.findCandidateDocuments(parseInt(id));
  }
}
