import {
    Controller,
    Get,
    Query,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { StudentDto } from '../dto/student.dto'
import { StatsStudentService } from '../services/stats-student.service'

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
    constructor(
        private readonly statsService: StatsStudentService,
    ) { }
    @Get('students')
    async getStudents(
        @Query() query: StudentDto,
    ) {
        return this.statsService.getStudents(query)
    }
}