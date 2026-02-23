import { Injectable } from '@nestjs/common';
import { CreateDefenseManagementTfcDto } from './dto/create-defense-management-tfc.dto';
import { UpdateDefenseManagementTfcDto } from './dto/update-defense-management-tfc.dto';

@Injectable()
export class DefenseManagementTfcService {
  create(createDefenseManagementTfcDto: CreateDefenseManagementTfcDto) {
    return 'This action adds a new defenseManagementTfc';
  }

  findAll() {
    return `This action returns all defenseManagementTfc`;
  }

  findOne(id: number) {
    return `This action returns a #${id} defenseManagementTfc`;
  }

  update(id: number, updateDefenseManagementTfcDto: UpdateDefenseManagementTfcDto) {
    return `This action updates a #${id} defenseManagementTfc`;
  }

  remove(id: number) {
    return `This action removes a #${id} defenseManagementTfc`;
  }
}
