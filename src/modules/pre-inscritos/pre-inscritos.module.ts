import { Module } from '@nestjs/common';
import { PreInscritosController } from './pre-inscritos.controller';
import { PreInscritosService } from './pre-inscritos.service';

@Module({
  controllers: [PreInscritosController],
  providers: [PreInscritosService],
})
export class PreInscritosModule {}
