import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'


import { StudentDto } from '../dto/student.dto'
import { StudentStatsResponseDto } from '../dto/student-response.dto'
import {
    buildStudentEnrollmentsQuery,
    buildStudentStatsWhereClause,
    buildStudentTotalQuery,
} from '../query-builder/student.query-builder'


@Injectable()
export class StatsStudentService {
    constructor(
        private readonly dataSource: DataSource,
    ) { }
    async getStudents(
        query: StudentDto,
    ): Promise<StudentStatsResponseDto> {
        const {
            clauses,
            params,
        } = buildStudentStatsWhereClause(query)
        const whereClause =
            clauses.length > 0
                ? clauses.join(' AND ')
                : '1=1'
        const [
            matriculados,
            totalAlunos,
        ] = await Promise.all([
            this.dataSource.query(
                buildStudentEnrollmentsQuery(
                    whereClause,
                ),
                params as any,
            ),
            this.dataSource.query(
                buildStudentTotalQuery(
                    whereClause,
                ),
                params as any,
            ),

        ])
        const academicYears =
            matriculados.map(
                (item) => {
                    const students =
                        totalAlunos.find(
                            (student) =>
                                student.ANO_LECTIVO ===
                                item.ANO_LECTIVO &&
                                student.CODIGO_CANDIDATURA ===
                                item.CODIGO_CANDIDATURA,
                        )
                    return {
                        academicYear:
                            item.ANO_LECTIVO,
                        applicationTypeCode:
                            item.CODIGO_CANDIDATURA,
                        applicationType:
                            item.TIPO_CANDIDATURA,
                        totalEnrollments:
                            Number(
                                item.TOTAL ?? 0,
                            ),
                        totalStudents:
                            Number(
                                students?.TOTAL ?? 0,
                            ),
                    }
                },
            )
        return {
            data: academicYears,
        }

    }

}