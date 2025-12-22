// src/users/users.controller.ts
import { Controller, Post, Headers, Body, ValidationPipe } from '@nestjs/common';
import { UsersService } from './users.service'
import { CreatePersonUserDto } from './dto/create-person-user.dto';
import { CreatePersonUserResponseDto } from './dto/create-person-user-response.dto';

import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('acess_management')
export class AcessManagementController {
  constructor(private readonly usersService: UsersService
  ) {}

  @Post('create-person-user')
  @ApiOperation({ summary: 'Criar uma pessoa e utilizador do sistema com grupo unitário' })
  @ApiResponse({ status: 201, type: CreatePersonUserResponseDto })
  async criarPessoaEUtilizador(
    @Body(ValidationPipe) dto: CreatePersonUserDto,
    @Headers('x-user-logado-id') usuarioLogadoId: number
  ): Promise<CreatePersonUserResponseDto> {
    return this.usersService.criarPessoaEUtilizador(dto, usuarioLogadoId);
  }

}