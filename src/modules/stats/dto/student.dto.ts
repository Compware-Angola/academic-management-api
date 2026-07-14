import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsNumber } from 'class-validator'
import { Type } from 'class-transformer'

export class StudentDto {
    @ApiPropertyOptional({
        description: 'Código do tipo de candidatura',
        example: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    codigoCandidatura?: number
}