import { PartialType } from '@nestjs/swagger';
import { CreateStatisticsReportDto } from './create-statistics-report.dto';

export class UpdateStatisticsReportDto extends PartialType(CreateStatisticsReportDto) {}
