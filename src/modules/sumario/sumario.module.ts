import { Module } from '@nestjs/common';
import { SumarioService } from './sumario.service';
import { SumarioController } from './sumario.controller';

@Module({
  controllers: [SumarioController],
  providers: [SumarioService],
})
export class SumarioModule {}
