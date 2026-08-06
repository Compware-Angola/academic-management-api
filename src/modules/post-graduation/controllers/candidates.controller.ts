import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CandidatesService } from '../services/candidates.service';

import { ApiTags } from '@nestjs/swagger';
import { CandidateDecisionService } from '../services/candidate-decision.service';
import { ApproveCandidateDto } from '../dto/approve-candidate.dto';
import { RejectCandidateDto } from '../dto/reject-candidate.dto';
import { FindCandidatesDto } from '../dto/candidates.dto';

@ApiTags('Pos Graduacao - Candidatos')
@Controller('post-graduation/candidates')
export class CandidatesController {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly decisionService: CandidateDecisionService,
  ) {}

  @Get()
  async findCandidates(@Query() query: FindCandidatesDto) {
    return this.candidatesService.findCandidates(query);
  }

  @Get(':id/documents')
  async findCandidateDocuments(@Param('id') id: string) {
    return this.candidatesService.findCandidateDocuments(parseInt(id));
  }

  @Post('approve')
  async approve(@Body() dto: ApproveCandidateDto) {
    return this.decisionService.approve(dto);
  }

  @Post('reject')
  async reject(@Body() dto: RejectCandidateDto) {
    return this.decisionService.reject(dto);
  }
}
