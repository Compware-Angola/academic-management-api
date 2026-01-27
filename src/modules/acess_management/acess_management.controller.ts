
import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  Headers,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreatePersonUserDto } from './dto/create-person-user.dto';
import { CreatePersonUserResponseDto } from './dto/create-person-user-response.dto';
import { LogsService } from './logs.service';
import { FilterLogsAcessoDto } from './dto/filter-logs-acesso.dto';
import { LogAcessoResponseDto } from './dto/log-acesso-response.dto';
import { AcessosService } from './acess_management.service';
import { FilterAcessoDto } from './dto/filter-acesso.dto';
import { AcessoResponseDto } from './dto/acesso.response.dto';

import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { UserListItemDto } from './dto/user-list-item.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { CreateAcessoDto } from './dto/create-acesso.dto';

import { FilterUserLogadoDto } from './dto/filter-user-logado.dto';
import { CreateLogsDTO } from './dto/create-logs.dto';
import { RequiredPermissions } from '../common/pipes/permissions.decorator';
import { PermissionType, PermissionTypeDetails } from '../common/enums/permission.type';
import { PermissionsGuard } from '../common/secret/permissions.guard';
import { RemoteJwtAuthGuard } from '../common/guard/remote.jwt-auth.guard';
import { AccessLogHelper } from '../common/helpers/access-log.helper';
import { HttpService } from '@nestjs/axios';

@Controller('acess_management')
export class AcessManagementController {
  constructor(
    private readonly usersService: UsersService,
    private readonly logsService: LogsService,
    private readonly acessosService: AcessosService,
    private httpService: HttpService,
  ) { }

  @Post('create-person-user')
  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @RequiredPermissions(PermissionTypeDetails.CRIAR_UTILIZADOR.sigla)
  @ApiOperation({
    summary: 'Criar uma pessoa e utilizador do sistema com grupo unitário',
  })
  @ApiResponse({ status: 201, type: CreatePersonUserResponseDto })
  async criarPessoaEUtilizador(
    @Body(ValidationPipe) dto: CreatePersonUserDto,
    @Req() req: any

  ): Promise<CreatePersonUserResponseDto> {
    const usuarioLogado = req.user;
    const userDateResponse = await this.usersService.criarPessoaEUtilizador(dto, usuarioLogado.sub);
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    await AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${usuarioLogado?.nome} Criou O Utilizador ${userDateResponse.username}`,
      fkAcesso: 155,
      fkFuncionalidade: 232,
      fkUtilizadorResponsavel: usuarioLogado.sub,
      fkOperacaoLog: 7,
      ip: ip,
    });
    return userDateResponse;
  }

  @Post('novo-acesso')
  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria um novo acesso no sistema' })
  @ApiResponse({ status: 201, description: 'Acesso criado com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou sigla duplicada',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async criar(@Body() createAcessoDto: CreateAcessoDto, @Req() req: any) {
  
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const usuarioLogado = req.user;

    const novoAcesso = await this.acessosService.criarAcesso(
      createAcessoDto,
      usuarioLogado.sub,
    );
     await AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${usuarioLogado?.nome} Criou novo acesso ao sistema ${createAcessoDto.sigla}`,
      fkAcesso: 155,
      fkFuncionalidade: 232,
      fkUtilizadorResponsavel: usuarioLogado.sub,
      fkOperacaoLog: 7,
      ip: ip,
    });

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Acesso criado com sucesso',
      data: novoAcesso,
    };
  }
  @Get('users/users-logado')
  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @RequiredPermissions(PermissionTypeDetails.LISTAR_UTILIZADORES_LOGADOS.sigla)
  @ApiOperation({ summary: 'Lista acessos de utilizadores (logados ou não)' })
  async listAcessos(@Query() filter: FilterUserLogadoDto) {
    return this.usersService.listUsersAcesso(filter);
  }

  @Put('teacher-password')
  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @RequiredPermissions(PermissionTypeDetails.ACTUALIZAR_SENHA_DOCENTE.sigla)
  @ApiOperation({ summary: 'Atualizar a senha de um utilizador' })
  @ApiResponse({ status: 200, description: 'Senha atualizada' })
  @ApiNotFoundResponse({ description: 'Utilizador não encontrado' })
  async updatePassword(@Body(ValidationPipe) dto: UpdatePasswordDto, @Req() req: any) {
    const usuarioLogado = req.user;
    const userDateResponse = await this.usersService.updatePassword(dto, usuarioLogado.sub);
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    await AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${usuarioLogado?.nome} Atualizou a senha do Utilizador ${dto.utilizadorId}`,
      fkAcesso: 155,
      fkFuncionalidade: 232,
      fkUtilizadorResponsavel: usuarioLogado.sub,
      fkOperacaoLog: 7,
      ip: ip,
    });
    return userDateResponse;
  }

  @Put('add-group-to-user/:userId/:groupId')
  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @ApiOperation({ summary: 'Adicionar um grupo a um utilizador' })
  @ApiResponse({ status: 200, description: 'Grupo adicionado ao utilizador' })
  @ApiNotFoundResponse({ description: 'Utilizador ou grupo não encontrado' })
  async addGroupToUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Headers('x-user-logado-id') usuarioLogadoId: number,
  ) {
    return this.usersService.addgroupToUser(userId, groupId, usuarioLogadoId);
  }

  @Put('remove-group-from-user/:userId/:groupId')
  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @ApiOperation({ summary: 'Remover um grupo de um utilizador' })
  @ApiResponse({ status: 200, description: 'Grupo removido do utilizador' })
  @ApiNotFoundResponse({ description: 'Utilizador ou grupo não encontrado' })
  async removeGroupFromUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Headers('x-user-logado-id') usuarioLogadoId: number,
  ) {
    return this.usersService.removeGroupFromUser(
      userId,
      groupId,
      usuarioLogadoId,
    );
  }

  @Get('users')
  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @RequiredPermissions(PermissionTypeDetails.LISTA_DE_UTILIZADORES.sigla,
    PermissionTypeDetails.LISTA_DE_UTILIZADORES2.sigla
  )
  @ApiOperation({
    summary: 'Listar utilizadores (com filtro por ativo/inativo)',
  })
  @ApiResponse({ status: 200, type: [UserListItemDto] })
  async list(@Query(ValidationPipe) filter: UserFilterDto) {
    return this.usersService.listUsers(filter);
  }

  @Get('logs-acessos-funcionalidade')
  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @ApiOperation({
    summary:
      'Listar logs de acesso a funcionalidades com filtro por utilizador e intervalo de datas',
  })
  @ApiResponse({ status: 200, type: [LogAcessoResponseDto] })
  async findAllByUtilizadorAndDatas(
    @Query(ValidationPipe) dto: FilterLogsAcessoDto,
  ) {
    return this.logsService.findAllByUtilizadorAndDatas(dto);
  }
  @Post('create-logs')
  @ApiOperation({
    summary:
      'Criar Logs ',
  })
  @ApiCreatedResponse({
    description: 'Log de acesso criado com sucesso',
    type: CreateLogsDTO,
  })
  async createLogs(@Body() dto: CreateLogsDTO) {
    return this.logsService.create(dto)
  }


  // GET /acessos
  @Get('details/all')
  @ApiOperation({
    summary: 'Lista todos os acessos com filtros opcionais',
    description:
      'Retorna acessos filtrados por utilizador, grupo ou apenas ativos. Omitir filtros retorna todos os ativos.',
  })
  @ApiQuery({ name: 'utilizadorId', required: false, type: Number })
  @ApiQuery({ name: 'grupoId', required: false, type: Number })
  @ApiQuery({
    name: 'apenasAtivos',
    required: false,
    type: Boolean,
    example: 'true',
  })
  @ApiResponse({ status: 200, type: [AcessoResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  async listarTodos(@Query(ValidationPipe) filter: FilterAcessoDto) {
    return this.acessosService.listarAcessos(filter);
  }

  @Get('details/all/dropdown')
  @ApiOperation({
    summary: 'Lista todos os acessos com filtros opcionais',
    description:
      'Retorna acessos filtrados por utilizador, grupo ou apenas ativos. Omitir filtros retorna todos os ativos.',
  })
  @ApiQuery({ name: 'utilizadorId', required: false, type: Number })
  @ApiQuery({ name: 'grupoId', required: false, type: Number })
  @ApiQuery({
    name: 'apenasAtivos',
    required: false,
    type: Boolean,
    example: 'true',
  })
  @ApiResponse({ status: 200, type: [AcessoResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  async listarAcessosDropDown(
    @Query(ValidationPipe) filter: FilterAcessoDto,
  ): Promise<AcessoResponseDto[]> {
    return this.acessosService.listarAcessosDropDown(filter);
  }

  // GET /acessos/utilizador/:id
  @Get('utilizador/:id')
  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @ApiOperation({
    summary: 'Lista todos os acessos de um utilizador específico',
    description:
      'Retorna apenas os acessos ativos atribuídos ao utilizador via grupo (incluindo grupo unitário).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do utilizador (PK_UTILIZADOR)',
    example: 123,
  })
  @ApiResponse({ status: 200, type: [AcessoResponseDto] })
  @ApiNotFoundResponse({
    description: 'Utilizador não encontrado ou sem acessos',
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  async listarPorUtilizador(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AcessoResponseDto[]> {
    return this.acessosService.listarPorUtilizador(id);
  }

  // GET /acessos/grupo/:id
  @Get('grupo/:id')
  @ApiOperation({
    summary: 'Lista todos os acessos atribuídos a um grupo específico',
    description:
      'Útil para visualizar permissões de grupos comuns ou unitários.',
  })
  @ApiParam({ name: 'id', description: 'ID do grupo (PK_GRUPO)', example: 4 })
  @ApiResponse({ status: 200, type: [AcessoResponseDto] })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado ou sem acessos' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  async listarPorGrupo(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AcessoResponseDto[]> {
    return this.acessosService.listarPorGrupo(id);
  }


  @Post('utilizador/:utilizadorId/acesso/:acessoId')
  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Adiciona ou reativa acesso para um utilizador',
    description:
      'Se o acesso estiver removido, reativa. Caso contrário, adiciona ao grupo unitário.',
  })
  @ApiParam({ name: 'utilizadorId', description: 'ID do utilizador alvo' })
  @ApiParam({ name: 'acessoId', description: 'ID do acesso a ser adicionado' })
  @ApiResponse({
    status: 201,
    description: 'Acesso adicionado/reativado com sucesso',
  })
  @ApiBadRequestResponse({
    description: 'Dados inválidos ou acesso já existente',
  })
  @ApiNotFoundResponse({
    description: 'Utilizador, grupo ou acesso não encontrado',
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  async adicionarAcesso(
    @Param('utilizadorId', ParseIntPipe) utilizadorId: number,
    @Param('acessoId', ParseIntPipe) acessoId: number,
  ) {

    const usuarioLogadoId = 1;
    return this.acessosService.adicionarAcesso(
      utilizadorId,
      acessoId,
      usuarioLogadoId,
    );
  }
  //Adicionar Grupo no acesso
  @Post('grupo/:grupoId/acesso/:acessoId')
  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Adiciona ou reativa acesso para um grupo',
    description:
      'Se o acesso estiver removido, reativa. Caso contrário, adiciona ao grupo.',
  })
  @ApiParam({ name: 'grupoId', description: 'ID do grupo alvo' })
  @ApiParam({ name: 'acessoId', description: 'ID do acesso a ser adicionado' })
  @ApiResponse({
    status: 201,
    description: 'Acesso adicionado/reativado com sucesso',
  })
  @ApiBadRequestResponse({
    description: 'Dados inválidos ou acesso já existente',
  })
  @ApiNotFoundResponse({
    description: 'grupo ou acesso não encontrado',
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  async adicionarGrupoAcesso(
    @Param('grupoId', ParseIntPipe) grupoId: number,
    @Param('acessoId', ParseIntPipe) acessoId: number,
  ) {
    // Você pode validar se o usuário logado tem permissão aqui
    const usuarioLogadoId = 1;
    return this.acessosService.adicionarGrupoAcesso(
      grupoId,
      acessoId,
      usuarioLogadoId,
    );
  }

  // DELETE /acessos/utilizador/:utilizadorId/acesso/:acessoId
  @Delete('utilizador/:utilizadorId/acesso/:acessoId')
  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove ou revoga acesso de um utilizador',
    description:
      'Marca o acesso como removido para o grupo unitário do utilizador.',
  })
  @ApiParam({ name: 'utilizadorId', description: 'ID do utilizador alvo' })
  @ApiParam({ name: 'acessoId', description: 'ID do acesso a ser removido' })
  @ApiResponse({
    status: 200,
    description: 'Acesso removido/revogado com sucesso',
  })
  @ApiNotFoundResponse({
    description: 'Utilizador, grupo ou acesso não encontrado',
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  async removerAcesso(
    @Param('utilizadorId', ParseIntPipe) utilizadorId: number,
    @Param('acessoId', ParseIntPipe) acessoId: number,
    @Headers('x-user-logado-id') usuarioLogadoId: number,
  ) {
    return this.acessosService.removerAcesso(
      utilizadorId,
      acessoId,
      usuarioLogadoId,
    );
  }
  //Remover Acesso no grupo
  @Delete('grupo/:grupoId/acesso/:acessoId')
  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove ou revoga acesso de um grupo',
    description: 'Marca o acesso como removido para o grupo .',
  })
  @ApiParam({ name: 'grupoId', description: 'ID do grupo alvo' })
  @ApiParam({ name: 'acessoId', description: 'ID do acesso a ser removido' })
  @ApiResponse({
    status: 200,
    description: 'Acesso removido/revogado com sucesso',
  })
  @ApiNotFoundResponse({
    description: 'Utilizador, grupo ou acesso não encontrado',
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  async removerGrupoAcesso(
    @Param('grupoId', ParseIntPipe) grupoId: number,
    @Param('acessoId', ParseIntPipe) acessoId: number,
    @Req() req: any,
  ) {
    const usuarioLogadoId = req.user.sub;
    return this.acessosService.removerGrupoAcesso(
      grupoId,
      acessoId,
      usuarioLogadoId,
    );
  }
}
