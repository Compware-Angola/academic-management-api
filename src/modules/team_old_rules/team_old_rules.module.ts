import { Module } from '@nestjs/common';
import { TeamOldRulesService } from './team_old_rules.service';
import { TeamOldRulesController } from './team_old_rules.controller';

@Module({
  controllers: [TeamOldRulesController],
  providers: [TeamOldRulesService],
})
export class TeamOldRulesModule {}
