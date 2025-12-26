import { Module } from '@nestjs/common';
import { AcessManagementService } from './acess_management.service';
import { UsersService } from './users.service';
import { AcessManagementController } from './acess_management.controller';
import { ReferenciasController } from './referencias.controller';
import { ReferenciasService } from './referencias.service';
import { LogsService } from './logs.service';

@Module({
  controllers: [AcessManagementController, ReferenciasController],
  providers: [AcessManagementService, UsersService, ReferenciasService, LogsService],
})
export class AcessManagementModule {}
