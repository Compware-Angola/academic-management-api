import { PaginationDto } from 'src/common/helpers/pagination.dto';
import { DocumentTypeDto } from './document-type.dto';



export class DocumentTypeResponseDto {
    data: DocumentTypeDto[];
    pagination: PaginationDto;

    constructor(
        data: DocumentTypeDto[],
        pagination: PaginationDto,
    ) {
        this.data = data;
        this.pagination = pagination;
    }
}