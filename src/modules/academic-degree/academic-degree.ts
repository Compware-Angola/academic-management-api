import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AcademicDegree } from './entities/academic-degree.entity';
import { FindAcademicDegreesDto } from './dto/find-academic-degree.dto';
import { AcademicDegreesDto } from './dto/academic-degree.dto';
import { AcademicDegreesResponseDto } from './dto/academic-degree.response.dto';
import { PaginationDto } from 'src/common/helpers/pagination.dto';

@Injectable()
export class AcademicDegreeService {
  constructor(
    @InjectRepository(AcademicDegree)
    private readonly academicDegreeRepository: Repository<AcademicDegree>,
  ) {}

  async findAll(
    query: FindAcademicDegreesDto,
  ): Promise<AcademicDegreesResponseDto> {
    const { page = 1, limit = 10, search, ids } = query;
    const qb =
      this.academicDegreeRepository.createQueryBuilder('academicDegree');
    if (search?.trim()) {
      qb.andWhere(
        'fn_remove_acentos(LOWER(academicDegree.description)) LIKE fn_remove_acentos(:search)',
        {
          search: `%${search.trim().toLowerCase()}%`,
        },
      );
    }
    if (query.status) {
      qb.andWhere('academicDegree.status = :status', { status: query.status });
    }
    if (ids?.length) {
      qb.andWhere('academicDegree.id IN (:...ids)', { ids });
    }
    qb.orderBy('fn_remove_acentos(LOWER(academicDegree.description))', 'ASC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [items, total] = await qb.getManyAndCount();

    return new AcademicDegreesResponseDto(
      items.map(
        (item) =>
          new AcademicDegreesDto({
            id: item.id,
            description: item.description,
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
