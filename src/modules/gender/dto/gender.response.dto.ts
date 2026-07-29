import { PaginationDto } from 'src/common/helpers/pagination.dto';
import { GendersDto } from './gender.dto';

export class GendersResponseDto {
    data: GendersDto[];
    pagination: PaginationDto;

    constructor(
        data: GendersDto[],
        pagination: PaginationDto,
    ) {
        this.data = data;
        this.pagination = pagination;
    }
}