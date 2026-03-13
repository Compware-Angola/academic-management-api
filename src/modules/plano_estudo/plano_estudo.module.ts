import { Module } from '@nestjs/common';
import { PlanoEstudoService } from './plano_estudo.service';
import { PlanoEstudoController } from './plano_estudo.controller';

@Module({
  controllers: [PlanoEstudoController],
  providers: [PlanoEstudoService],
})
export class PlanoEstudoModule {}
