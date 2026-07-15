import { ApiProperty } from '@nestjs/swagger'

export class StudentStatsItemDto {
    @ApiProperty({
        example: '2025/2026',
    })
    academicYear: string

    @ApiProperty({
        example: 1200,
    })
    totalEnrollments: number
}

export class StudentStatsResponseDto {
    @ApiProperty({
        type: [StudentStatsItemDto],
    })
    data: StudentStatsItemDto[]
}