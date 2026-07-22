import { PaginationDto } from 'src/common/helpers/pagination.dto';
import { CourseTrainingAreaDto } from './course-training-area.dto';

export class CourseTrainingAreasResponseDto {
    data: CourseTrainingAreaDto[];
    pagination: PaginationDto;

    constructor(
        data: CourseTrainingAreaDto[],
        pagination: PaginationDto,
    ) {
        this.data = data;
        this.pagination = pagination;
    }
}