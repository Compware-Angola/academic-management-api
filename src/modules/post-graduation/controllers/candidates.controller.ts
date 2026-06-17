import { Controller, Get, Query } from '@nestjs/common';
import { CandidatesService } from '../candidates.service';
import { FindCandidatesDto } from '../dto/candidates.dto';

@Controller('post-graduation/candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get()
  findCandidates(@Query() query: FindCandidatesDto) {
    return this.candidatesService.findCandidates(query);
  }
}
