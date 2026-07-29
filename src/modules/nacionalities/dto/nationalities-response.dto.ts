import { PaginationDto } from 'src/common/helpers/pagination.dto';
import { NationalityDto } from './nationality.dto';



export class NationalitiesResponseDto {
    data: NationalityDto[];
    pagination: PaginationDto;

    constructor(
        data: NationalityDto[],
        pagination: PaginationDto,
    ) {
        this.data = data;
        this.pagination = pagination;
    }
}