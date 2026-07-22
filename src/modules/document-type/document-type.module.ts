import { Module } from '@nestjs/common';
import { DocumentTypeController } from './document-type.controller';
import { DocumentTypeService } from './document-type.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentType } from './entities/document-type.entity';

@Module({
    imports: [TypeOrmModule.forFeature([DocumentType])],
    controllers: [DocumentTypeController],
    providers: [DocumentTypeService]
})
export class DocumentTypeModule { }