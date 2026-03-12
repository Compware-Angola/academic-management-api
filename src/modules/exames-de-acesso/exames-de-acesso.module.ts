import { Module } from '@nestjs/common';
import { ExamesDeAcessoController } from './exames-de-acesso.controller';
import { ExamesDeAcessoService } from './exames-de-acesso.service';

@Module({
  controllers: [ExamesDeAcessoController],
  providers: [ExamesDeAcessoService],
})
export class ExamesDeAcessoModule {}
