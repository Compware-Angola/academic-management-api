import { Module } from '@nestjs/common';
import { TopicosService } from './topicos.service';
import { TopicosController } from './topicos.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [TopicosController],
  providers: [TopicosService],
})
export class TopicosModule {}
