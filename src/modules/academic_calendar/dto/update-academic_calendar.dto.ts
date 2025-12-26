import { PartialType } from '@nestjs/swagger';
import { CreateAcademicCalendarDto } from './create-academic_calendar.dto';

export class UpdateAcademicCalendarDto extends PartialType(CreateAcademicCalendarDto) {}
