// src/users/dto/update-person-user.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreatePersonUserDto } from './create-person-user.dto';

export class UpdatePersonUserDto extends PartialType(CreatePersonUserDto) {}