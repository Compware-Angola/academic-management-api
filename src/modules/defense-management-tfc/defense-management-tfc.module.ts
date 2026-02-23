import { Module } from '@nestjs/common';
import { DefenseManagementTfcService } from './defense-management-tfc.service';
import { DefenseManagementTfcController } from './defense-management-tfc.controller';

@Module({
  controllers: [DefenseManagementTfcController],
  providers: [DefenseManagementTfcService],
})
export class DefenseManagementTfcModule {}
