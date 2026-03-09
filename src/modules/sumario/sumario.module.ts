import { Module } from '@nestjs/common';
import { SumarioService } from './sumario.service';
import { SumarioController } from './sumario.controller';
import { ParametrosController } from './parametors.controller';
import { ParametrosService } from './parametros.service';

@Module({
  controllers: [SumarioController,ParametrosController],
  providers: [SumarioService,ParametrosService],
})
export class SumarioModule {}
