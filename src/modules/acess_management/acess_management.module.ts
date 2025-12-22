import { Module } from '@nestjs/common';
import { AcessManagementService } from './acess_management.service';
import { UsersService } from './users.service';
import { AcessManagementController } from './acess_management.controller';
import { ReferenciasController } from './referencias.controller';
import { ReferenciasService } from './referencias.service';

@Module({
  controllers: [AcessManagementController, ReferenciasController],
  providers: [AcessManagementService, UsersService, ReferenciasService],
})
export class AcessManagementModule {}
