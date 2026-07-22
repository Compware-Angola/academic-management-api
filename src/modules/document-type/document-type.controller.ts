import { Controller, Get, Query } from '@nestjs/common';

import { FindDocumentTypeDto } from './dto/find-document-type.dto';
import { DocumentTypeService } from './document-type.service';

@Controller('document-type')
export class DocumentTypeController {
    constructor(
        private readonly documentTypeService: DocumentTypeService,
    ) { }

    @Get()
    findAll(@Query() query: FindDocumentTypeDto) {
        return this.documentTypeService.findAll(query);
    }
}