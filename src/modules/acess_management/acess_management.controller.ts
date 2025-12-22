// src/users/users.controller.ts
import { Controller, Post, Get, Headers, Query, Body, ValidationPipe } from '@nestjs/common';
import { UsersService } from './users.service'
import { CreatePersonUserDto } from './dto/create-person-user.dto';
import { CreatePersonUserResponseDto } from './dto/create-person-user-response.dto';
import { LogsService } from './logs.service';
import { FilterLogsAcessoDto } from './dto/filter-logs-acesso.dto';
import { LogAcessoResponseDto } from './dto/log-acesso-response.dto';

import { ApiOperation, ApiResponse } from '@nestjs/swagger';

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