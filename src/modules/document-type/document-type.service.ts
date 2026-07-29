import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DocumentType } from './entities/document-type.entity';
import { FindDocumentTypeDto } from './dto/find-document-type.dto';
import { DocumentTypeDto } from './dto/document-type.dto';
import { DocumentTypeResponseDto } from './dto/document-type-response.dto';
import { PaginationDto } from 'src/common/helpers/pagination.dto';

@Injectable()
export class DocumentTypeService {
    constructor(
        @InjectRepository(DocumentType)
        private readonly documentTypeRepository: Repository<DocumentType>,
    ) { }

    async findAll(
        query: FindDocumentTypeDto,
    ): Promise<DocumentTypeResponseDto> {
        const { page = 1, limit = 10, search, ids } = query;
        const qb = this.documentTypeRepository.createQueryBuilder('documentType');
        if (search?.trim()) {
            qb.andWhere(
                'fn_remove_acentos(LOWER(documentType.description)) LIKE fn_remove_acentos(:search)',
                {
                    search: `%${search.trim().toLowerCase()}%`,
                },
            );
        }
        if (ids?.length) {
            qb.andWhere('documentType.id IN (:...ids)', { ids });
        }
        qb.orderBy('fn_remove_acentos(LOWER(documentType.description))', 'ASC');

        qb.skip((page - 1) * limit);
        qb.take(limit);

        const [items, total] = await qb.getManyAndCount();

        return new DocumentTypeResponseDto(
            items.map(
                (item) =>
                    new DocumentTypeDto({
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