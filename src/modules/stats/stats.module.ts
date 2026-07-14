import { Global, Module } from "@nestjs/common";
import { StatsController } from "./contollers/statis-student.controller";
import { StatsStudentService } from "./services/stats-student.service";


@Module({
    controllers: [StatsController],
    providers: [StatsStudentService],
})
export class StatisModule { }