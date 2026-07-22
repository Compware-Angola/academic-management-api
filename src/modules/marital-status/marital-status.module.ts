import { Module } from '@nestjs/common';
import { MaritalStatusController } from './marital-status.controller';
import { MaritalStatusService } from './marital-status.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaritalStatus } from './entities/marital-status.entity';

@Module({
    imports: [TypeOrmModule.forFeature([MaritalStatus])],
    controllers: [MaritalStatusController],
    providers: [MaritalStatusService]
})
export class MaritalStatusModule { }