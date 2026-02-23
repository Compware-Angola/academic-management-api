import { PartialType } from '@nestjs/mapped-types';
import { CreateDefenseManagementTfcDto } from './create-defense-management-tfc.dto';

export class UpdateDefenseManagementTfcDto extends PartialType(CreateDefenseManagementTfcDto) {}
