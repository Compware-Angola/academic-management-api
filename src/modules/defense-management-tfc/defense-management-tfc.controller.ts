import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DefenseManagementTfcService } from './defense-management-tfc.service';
import { CreateDefenseManagementTfcDto } from './dto/create-defense-management-tfc.dto';
import { UpdateDefenseManagementTfcDto } from './dto/update-defense-management-tfc.dto';

@Controller('defense-management-tfc')
export class DefenseManagementTfcController {
  constructor(private readonly defenseManagementTfcService: DefenseManagementTfcService) {}

  @Post()
  create(@Body() createDefenseManagementTfcDto: CreateDefenseManagementTfcDto) {
    return this.defenseManagementTfcService.create(createDefenseManagementTfcDto);
  }

  @Get()
  findAll() {
    return this.defenseManagementTfcService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.defenseManagementTfcService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDefenseManagementTfcDto: UpdateDefenseManagementTfcDto) {
    return this.defenseManagementTfcService.update(+id, updateDefenseManagementTfcDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.defenseManagementTfcService.remove(+id);
  }
}
