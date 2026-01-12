import { Module } from '@nestjs/common';
import { AcessosService } from './acess_management.service';
import { UsersService } from './users.service';
import { AcessManagementController } from './acess_management.controller';
import { ReferenciasController } from './referencias.controller';
import { ReferenciasService } from './referencias.service';
import { LogsService } from './logs.service';
import { GruposController } from './grupo.controller';
import { GruposService } from './grupos.service';
import { CargosAdministrativosController } from './cargos-administrativos.controller';
import { CargosAdministrativosService } from './cargos-administrativos.service';
import { GroupsController } from './groups/groups.controller';
import { GroupsService } from './groups/groups.service';
import { SolicitacaoService } from './solicitacao.service';
import { SolicitacaoController } from './solicitacao.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [
    AcessManagementController,
    ReferenciasController,
    GruposController,
    CargosAdministrativosController,
    GroupsController,
    SolicitacaoController,
  ],
  providers: [
    AcessosService,
    UsersService,
    ReferenciasService,
    LogsService,
    GruposService,
    CargosAdministrativosService,
    GroupsService,
    SolicitacaoService,
  ],
})
export class AcessManagementModule {}
