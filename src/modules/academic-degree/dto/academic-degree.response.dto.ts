import { PaginationDto } from 'src/common/helpers/pagination.dto';
import { AcademicDegreesDto } from './academic-degree.dto';

export class AcademicDegreesResponseDto {
    data: AcademicDegreesDto[];
    pagination: PaginationDto;

    constructor(
        data: AcademicDegreesDto[],
        pagination: PaginationDto,
    ) {
        this.data = data;
        this.pagination = pagination;
    }
}