import { PaginationDto } from 'src/common/helpers/pagination.dto';
import { MaritalStatusDto } from './marital-status.dto';



export class MaritalStatusResponseDto {
    data: MaritalStatusDto[];
    pagination: PaginationDto;

    constructor(
        data: MaritalStatusDto[],
        pagination: PaginationDto,
    ) {
        this.data = data;
        this.pagination = pagination;
    }
}