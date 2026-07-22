import { Module } from '@nestjs/common';
import { NacionalitiesController } from './nacionalities.controller';
import { NationalityService } from './nacionalities.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nationality } from './entities/nacionalities.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Nationality])],
    controllers: [NacionalitiesController],
    providers: [NationalityService]
})
export class NacionalitiesModule { }