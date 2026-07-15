import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'

import { StudentStatsResponseDto } from '../dto/student-response.dto'
import { buildStudentEnrollmentsQuery } from '../query-builder/student.query-builder'

@Injectable()
export class StatsStudentService {
    constructor(
        private readonly dataSource: DataSource,
    ) { }

    async getStudents(): Promise<StudentStatsResponseDto> {
        const result = await this.dataSource.query(
            buildStudentEnrollmentsQuery(),
        )
        return {
            data: result.map((item: any) => ({
                academicYear: item.ANO_LECTIVO,
                totalEnrollments: Number(item.TOTAL),
            })),
        }
    }
}