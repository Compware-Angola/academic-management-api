import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule.register({
    timeout: 8000,
    maxRedirects: 5,
    httpAgent: { keepAlive: true },
    httpsAgent: { keepAlive: true },
  })],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule { }
