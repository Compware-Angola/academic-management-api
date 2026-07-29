import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Nationality } from './entities/nacionalities.entity';
import { FindNationalitiesDto } from './dto/find-nationalities.dto';
import { NationalityDto } from './dto/nationality.dto';
import { NationalitiesResponseDto } from './dto/nationalities-response.dto';
import { PaginationDto } from 'src/common/helpers/pagination.dto';

@Injectable()
export class NationalityService {
    constructor(
        @InjectRepository(Nationality)
        private readonly nationalityRepository: Repository<Nationality>,
    ) { }

    async findAll(
        query: FindNationalitiesDto,
    ): Promise<NationalitiesResponseDto> {
        const { page = 1, limit = 10, search } = query;
        const qb = this.nationalityRepository.createQueryBuilder('nationality');
        if (search?.trim()) {
            qb.andWhere(
                'fn_remove_acentos(LOWER(nationality.description)) LIKE fn_remove_acentos(:search)',
                {
                    search: `%${search.trim().toLowerCase()}%`,
                },
            );
        }
        qb.orderBy('fn_remove_acentos(LOWER(nationality.description))', 'ASC');

        qb.skip((page - 1) * limit);
        qb.take(limit);

        const [items, total] = await qb.getManyAndCount();

        return new NationalitiesResponseDto(
            items.map(
                (item) =>
                    new NationalityDto({
                        id: item.id,
                        description: item.description,
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