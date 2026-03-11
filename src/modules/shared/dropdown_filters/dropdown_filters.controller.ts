import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DropdownFiltersService } from './dropdown_filters.service';
import { CreateDropdownFilterDto } from './dto/create-dropdown_filter.dto';
import { UpdateDropdownFilterDto } from './dto/update-dropdown_filter.dto';

@Controller('dropdown-filters')
export class DropdownFiltersController {
  constructor(private readonly dropdownFiltersService: DropdownFiltersService) {}

  @Post()
  create(@Body() createDropdownFilterDto: CreateDropdownFilterDto) {
    return this.dropdownFiltersService.create(createDropdownFilterDto);
  }

  @Get()
  findAll() {
    return this.dropdownFiltersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dropdownFiltersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDropdownFilterDto: UpdateDropdownFilterDto) {
    return this.dropdownFiltersService.update(+id, updateDropdownFilterDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dropdownFiltersService.remove(+id);
  }
}
