import { Controller, Get, Query } from '@nestjs/common';
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
}
