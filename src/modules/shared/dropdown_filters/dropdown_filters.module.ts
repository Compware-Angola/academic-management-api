import { Module } from '@nestjs/common';
import { DropdownFiltersService } from './dropdown_filters.service';
import { DropdownFiltersController } from './dropdown_filters.controller';

@Module({
  controllers: [DropdownFiltersController],
  providers: [DropdownFiltersService],
})
export class DropdownFiltersModule {}
