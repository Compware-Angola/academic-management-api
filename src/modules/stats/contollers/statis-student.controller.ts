import {
    Controller,
    Get,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { StatsStudentService } from '../services/stats-student.service'

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
    constructor(
        private readonly statsService: StatsStudentService,
    ) { }
    @Get('students')
    async getStudents() {
        return this.statsService.getStudents()
    }
}