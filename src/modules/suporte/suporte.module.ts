import { Module } from '@nestjs/common';
import { SuporteService } from './suporte.service';
import { SuporteController } from './suporte.controller';

@Module({
  controllers: [SuporteController],
  providers: [SuporteService],
})
export class SuporteModule {}
