import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FindDocumentTypeDto {
    @ApiPropertyOptional({
        required: false,
        default: 1,
        type: 'number',
    })
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number;

    @ApiPropertyOptional({
        required: false,
        default: 100,
        type: 'number',
    })
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    @Type(() => Number)
    limit?: number;
    @ApiPropertyOptional({
        required: false,
        type: 'string',
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        required: false,
        type: [Number],
        example: [1, 2, 3],
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (!value) return [];

        const values = Array.isArray(value)
            ? value
            : String(value).split(',');

        return values.map((id) => Number(id.trim()));
    })
    @IsArray()
    @IsInt({ each: true })
    @Min(1, { each: true })
    ids?: number[];
    constructor() {
        this.page = 1;
        this.limit = 10;
        this.ids = []
    }
}