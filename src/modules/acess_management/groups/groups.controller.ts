import { Controller, Get, Query, Body, Post, Param, Put, Delete } from "@nestjs/common";
import { GroupsService } from "./groups.service";
import { GroupsDto } from "./dto/groups.dto";
import { GroupsFilterDto } from "./dto/filter-groups";

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

    @Get('find-all')
  async findAll(@Query() filter: GroupsFilterDto) {
    return this.groupsService.findAllGroups(filter);
  }

  @Post()
  async create(@Body() dto: GroupsDto) {
    const createdBy = 1; 
    return this.groupsService.createGroup(dto, createdBy);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() dto: GroupsDto) {
    const updatedBy = 1; 
    return this.groupsService.updateGroup(Number(id), dto, updatedBy);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    const updatedBy = 1; 
    return this.groupsService.deleteGroup(Number(id), updatedBy);
  }
}
