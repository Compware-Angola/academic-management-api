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
    @ApiProperty({
        example: 3500,
    })
    totalStudents: number
    @ApiProperty({
        example: 1200,
    })
    applicationTypeCode: number
    @ApiProperty({
        example: 3500,
    })
    applicationType: string
}
export class StudentStatsResponseDto {
    @ApiProperty({
        type: [StudentStatsItemDto],
    })
    data: StudentStatsItemDto[]

}

