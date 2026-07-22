import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Gender } from './entities/gender.entity';
import { FindGendersDto } from './dto/find-gender.dto';
import { GendersDto } from './dto/gender.dto';
import { GendersResponseDto } from './dto/gender.response.dto';
import { PaginationDto } from 'src/common/helpers/pagination.dto';

@Injectable()
export class GenderService {
    constructor(
        @InjectRepository(Gender)
        private readonly genderRepository: Repository<Gender>,
    ) { }

    async findAll(
        query: FindGendersDto,
    ): Promise<GendersResponseDto> {
        const { page = 1, limit = 10, search } = query;
        const qb = this.genderRepository.createQueryBuilder('gender');
        if (search?.trim()) {
            qb.andWhere(
                'fn_remove_acentos(LOWER(gender.description)) LIKE fn_remove_acentos(:search)',
                {
                    search: `%${search.trim().toLowerCase()}%`,
                },
            );
        }
        qb.orderBy('fn_remove_acentos(LOWER(gender.description))', 'ASC');

        qb.skip((page - 1) * limit);
        qb.take(limit);

        const [items, total] = await qb.getManyAndCount();

        return new GendersResponseDto(
            items.map(
                (item) =>
                    new GendersDto({
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