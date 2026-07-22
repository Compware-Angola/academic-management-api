import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FindNationalitiesDto {
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
    constructor() {
        this.page = 1;
        this.limit = 10;
    }
}