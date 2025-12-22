// src/users/users.controller.ts
import { Controller, Post, Get, Body, ValidationPipe } from '@nestjs/common';
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
  ): Promise<CreatePersonUserResponseDto> {
    // TODO: pegar usuarioLogadoId do JWT (ex: @GetUser() user)
    const usuarioLogadoId = 1; // temporário
    return this.usersService.criarPessoaEUtilizador(dto, usuarioLogadoId);
  }

}