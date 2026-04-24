import { Module } from '@nestjs/common';
import { ProvasService } from './provas.service';
import { ProvasController } from './provas.controller';

@Module({
  controllers: [ProvasController],
  providers: [ProvasService],
})
export class ProvasModule {}
