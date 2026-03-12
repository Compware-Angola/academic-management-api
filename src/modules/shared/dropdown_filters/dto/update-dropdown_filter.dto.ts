import { PartialType } from '@nestjs/swagger';
import { CreateDropdownFilterDto } from './create-dropdown_filter.dto';

export class UpdateDropdownFilterDto extends PartialType(CreateDropdownFilterDto) {}
