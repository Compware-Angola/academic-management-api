import { Module } from '@nestjs/common';
import { GenderController } from './marital-status.controller';
import { GenderService } from './gender.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gender } from './entities/gender.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Gender])],
    controllers: [GenderController],
    providers: [GenderService]
})
export class GenderModule { }