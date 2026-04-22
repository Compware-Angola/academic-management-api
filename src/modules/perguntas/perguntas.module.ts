import { Module } from '@nestjs/common';
import { PerguntasService } from './perguntas.service';
import { PerguntasController } from './perguntas.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [PerguntasController],
  providers: [PerguntasService],
})
export class PerguntasModule {}
