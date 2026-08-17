import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoCalendarioService } from './tipo-calendario.service';
import { TipoCalendarioController } from './tipo-calendario.controller';
import { TipoCalendario } from './entities/tipo-calendario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TipoCalendario])],
  controllers: [TipoCalendarioController],
  providers: [TipoCalendarioService],
  exports: [TipoCalendarioService],
})
export class TipoCalendarioModule {}
