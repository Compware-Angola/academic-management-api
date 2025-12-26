import { PartialType } from '@nestjs/swagger';
import { CreateTeamOldRuleDto } from './create-team_old_rule.dto';

export class UpdateTeamOldRuleDto extends PartialType(CreateTeamOldRuleDto) {}
