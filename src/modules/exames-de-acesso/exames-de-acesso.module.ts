import { Module } from '@nestjs/common';
import { ExamesDeAcessoController } from './exames-de-acesso.controller';
import { ExamesDeAcessoService } from './exames-de-acesso.service';
import { HttpModule } from '@nestjs/axios/dist/http.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5
    }),
    BullModule.registerQueue({
      name: 'results_final_exam',
    })
  ],

  controllers: [ExamesDeAcessoController],
  providers: [ExamesDeAcessoService],
})
export class ExamesDeAcessoModule { }
