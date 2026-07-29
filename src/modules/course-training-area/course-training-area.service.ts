import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CourseTrainingArea } from './entities/course-training-area.entity';

import { FindCourseTrainingAreaDto } from './dto/find-course-training-area.dto';
import { CourseTrainingAreaDto } from './dto/course-training-area.dto';
import { CourseTrainingAreasResponseDto } from './dto/course-training-area.response.dto';

import { PaginationDto } from 'src/common/helpers/pagination.dto';

@Injectable()
export class CourseTrainingAreaService {
    constructor(
        @InjectRepository(CourseTrainingArea)
        private readonly repository: Repository<CourseTrainingArea>,
    ) { }

    async findAll(
        query: FindCourseTrainingAreaDto,
    ): Promise<CourseTrainingAreasResponseDto> {
        const {
            page = 1,
            limit = 10,
            search,
            status,
        } = query;

        const qb = this.repository.createQueryBuilder('course');

        if (search?.trim()) {
            qb.andWhere(
                'fn_remove_acentos(LOWER(course.description)) LIKE fn_remove_acentos(:search)',
                {
                    search: `%${search.trim().toLowerCase()}%`,
                },
            );
        }

        if (status !== undefined) {
            qb.andWhere('course.status = :status', {
                status,
            });
        }

        qb.orderBy(
            'fn_remove_acentos(LOWER(course.description))',
            'ASC',
        );

        qb.skip((page - 1) * limit);
        qb.take(limit);

        const [items, total] = await qb.getManyAndCount();

        return new CourseTrainingAreasResponseDto(
            items.map(
                (item) =>
                    new CourseTrainingAreaDto({
                        id: item.id,
                        description: item.description,
                        trainingAreaId: item.trainingAreaId,
                        status: item.status,
                    }),
            ),
            new PaginationDto({
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            }),
        );
    }
}