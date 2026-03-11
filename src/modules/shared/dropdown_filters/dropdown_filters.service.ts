import { Injectable } from '@nestjs/common';
import { CreateDropdownFilterDto } from './dto/create-dropdown_filter.dto';
import { UpdateDropdownFilterDto } from './dto/update-dropdown_filter.dto';

@Injectable()
export class DropdownFiltersService {
  create(createDropdownFilterDto: CreateDropdownFilterDto) {
    return 'This action adds a new dropdownFilter';
  }

  findAll() {
    return `This action returns all dropdownFilters`;
  }

  findOne(id: number) {
    return `This action returns a #${id} dropdownFilter`;
  }

  update(id: number, updateDropdownFilterDto: UpdateDropdownFilterDto) {
    return `This action updates a #${id} dropdownFilter`;
  }

  remove(id: number) {
    return `This action removes a #${id} dropdownFilter`;
  }
}
