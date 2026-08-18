import { Module } from '@nestjs/common';
import { ExamesDeAcessoController } from './exames-de-acesso.controller';
import { ExamesDeAcessoService } from './exames-de-acesso.service';
import { HttpModule } from '@nestjs/axios/dist/http.module';
import { BullModule } from '@nestjs/bullmq';
import { QueueName } from 'src/common/constants/queue.constant';
import { PrevisaoNotaService } from './previsao-nota.service';
import { AdmissaoManualService } from './admissao-manual.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5
    }),
    BullModule.registerQueue({
      name: QueueName.RESULTS_FINAL_EXAM,
    })
  ],

  controllers: [ExamesDeAcessoController],
  providers: [ExamesDeAcessoService, PrevisaoNotaService, AdmissaoManualService],
})
export class ExamesDeAcessoModule { }
