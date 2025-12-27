import { Module } from '@nestjs/common';
import { AcessosService } from './acess_management.service';
import { UsersService } from './users.service';
import { AcessManagementController } from './acess_management.controller';
import { ReferenciasController } from './referencias.controller';
import { ReferenciasService } from './referencias.service';
import { LogsService } from './logs.service';
import { GruposController } from './grupo.controller';
import { GruposService } from './grupos.service';

@Module({
  controllers: [AcessManagementController, ReferenciasController, GruposController],
  providers: [AcessosService, UsersService, ReferenciasService, LogsService, GruposService],
})
export class AcessManagementModule {}
