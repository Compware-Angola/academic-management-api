import { ApiProperty } from '@nestjs/swagger'


export class StudentStatsItemDto {


    @ApiProperty({
        example: "2025-2026",
    })
    academicYear: string



    @ApiProperty({
        example: 2275,
    })
    newStudents: number



    @ApiProperty({
        example: 25000,
    })
    accumulatedStudents: number

}



export class StudentStatsResponseDto {


    @ApiProperty({
        type: [StudentStatsItemDto],
    })
    data: StudentStatsItemDto[]

}