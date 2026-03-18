import { Module } from '@nestjs/common';
import { DefenseManagementTfcService } from './defense-management-tfc.service';
import { DefenseManagementTfcController } from './defense-management-tfc.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports:[   HttpModule.register({
      timeout: 5000,
      maxRedirects: 5
    })],
  controllers: [DefenseManagementTfcController],
  providers: [DefenseManagementTfcService],
})
export class DefenseManagementTfcModule {}
