import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MaritalStatus } from './entities/marital-status.entity';
import { FindMaritalStatusDto } from './dto/find-marital-status.dto';
import { MaritalStatusDto } from './dto/marital-status.dto';
import { MaritalStatusResponseDto } from './dto/marital-status-response.dto';
import { PaginationDto } from 'src/common/helpers/pagination.dto';

@Injectable()
export class MaritalStatusService {
    constructor(
        @InjectRepository(MaritalStatus)
        private readonly maritalStatusRepository: Repository<MaritalStatus>,
    ) { }

    async findAll(
        query: FindMaritalStatusDto,
    ): Promise<MaritalStatusResponseDto> {
        const { page = 1, limit = 10, search } = query;
        const qb = this.maritalStatusRepository.createQueryBuilder('maritalStatus');
        if (search?.trim()) {
            qb.andWhere(
                'fn_remove_acentos(LOWER(maritalStatus.description)) LIKE fn_remove_acentos(:search)',
                {
                    search: `%${search.trim().toLowerCase()}%`,
                },
            );
        }
        qb.orderBy('fn_remove_acentos(LOWER(maritalStatus.description))', 'ASC');

        qb.skip((page - 1) * limit);
        qb.take(limit);

        const [items, total] = await qb.getManyAndCount();

        return new MaritalStatusResponseDto(
            items.map(
                (item) =>
                    new MaritalStatusDto({
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