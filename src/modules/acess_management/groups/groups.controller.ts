import {
  Controller,
  Get,
  Query,
  Logger
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsFilterDto } from './dto/filter-groups';


@Controller('groups')
export class GroupsController {
  private readonly logger = new Logger(GroupsController.name);

  constructor(
    private readonly groupsService: GroupsService
  ) {}

  /**
   * Listar grupos com paginação e filtros
   * GET /groups/find-all
   */
  @Get('find-all')
  async findAll(
    @Query() filter: GroupsFilterDto
  ) {
    this.logger.log('Request to fetch groups');

    return await this.groupsService.findAllGroups(filter);
  }
}
