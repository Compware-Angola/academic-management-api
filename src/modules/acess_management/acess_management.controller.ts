// src/users/users.controller.ts
import { Controller, Post, Put, Get, Headers, Query, Body, ValidationPipe } from '@nestjs/common';
import { UsersService } from './users.service'
import { CreatePersonUserDto } from './dto/create-person-user.dto';
import { CreatePersonUserResponseDto } from './dto/create-person-user-response.dto';
import { LogsService } from './logs.service';
import { FilterLogsAcessoDto } from './dto/filter-logs-acesso.dto';
import { LogAcessoResponseDto } from './dto/log-acesso-response.dto';

import { ApiNotFoundResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserListItemDto } from './dto/user-list-item.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UserFilterDto } from './dto/user-filter.dto';

@Controller('acess_management')
export class AcessManagementController {
  constructor(private readonly usersService: UsersService,
    private readonly logsService: LogsService
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

  @Put('teacher-password')
  @ApiOperation({ summary: 'Atualizar a senha de um utilizador' })
  @ApiResponse({ status: 200, description: 'Senha atualizada' })
  @ApiNotFoundResponse({ description: 'Utilizador não encontrado' })
  async updatePassword(
    @Body(ValidationPipe) dto: UpdatePasswordDto,
    @Headers('x-user-logado-id') usuarioLogadoId: number,  // ou @UserLogado('id') userId: number
  ) {
    return this.usersService.updatePassword(dto, usuarioLogadoId);
  }

  @Get('users')
  @ApiOperation({ summary: 'Listar utilizadores (com filtro por ativo/inativo)' })
  @ApiResponse({ status: 200, type: [UserListItemDto] })
  async list(
    @Query(ValidationPipe) filter: UserFilterDto,
  ): Promise<UserListItemDto[]> {
    return this.usersService.listUsers(filter);
  }

  @Get('logs-acessos-funcionalidade')
  @ApiOperation({ 
    summary: 'Listar logs de acesso a funcionalidades com filtro por utilizador e intervalo de datas' 
  })
  @ApiResponse({ status: 200, type: [LogAcessoResponseDto] })
  async findAllByUtilizadorAndDatas(
    @Query(ValidationPipe) dto: FilterLogsAcessoDto,
  ): Promise<LogAcessoResponseDto[]> {
    return this.logsService.findAllByUtilizadorAndDatas(dto);
  }

}