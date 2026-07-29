import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class FindCourseTrainingAreaDto {
    @ApiPropertyOptional({
        default: 1,
    })
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({
        default: 10,
    })
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        default: 1,
    })
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @IsIn([0, 1])
    status?: number;
}