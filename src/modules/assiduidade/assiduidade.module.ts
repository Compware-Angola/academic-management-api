import { Module } from '@nestjs/common';
import { AssiduidadeService } from './assiduidade.service';
import { AssiduidadeController } from './assiduidade.controller';

@Module({
  controllers: [AssiduidadeController],
  providers: [AssiduidadeService],
})
export class AssiduidadeModule {}
