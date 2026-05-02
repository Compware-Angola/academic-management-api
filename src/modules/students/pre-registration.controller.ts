import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    HttpCode,
    HttpStatus,
    ParseIntPipe,
    Req,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiQuery,
    ApiParam,
} from '@nestjs/swagger';

import { PreRegistrationService } from './pre-registration.service';
import { CreatePreRegistrationDto } from './dto/create-pre-inscricao.dto';
import { UpdatePreRegistrationDto } from './dto/update-pre-inscricao.dto';
import { QueryPreRegistrationDto } from './dto/queryPreRegistrationDto';
import { PermissionsGuard } from '../common/secret/permissions.guard';
import { RemoteJwtAuthGuard } from '../common/guard/remote.jwt-auth.guard';

@ApiTags('Pré-Inscrições')
@Controller('pre-inscricoes')
export class PreRegistrationController {
    constructor(private readonly service: PreRegistrationService) { }

    // ─────────────────────────────────────────────
    //  CREATE
    // ─────────────────────────────────────────────
    @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Criar nova pré-inscrição' })
    @ApiResponse({ status: 201, description: 'Pré-inscrição criada com sucesso' })
    @ApiResponse({ status: 409, description: 'BI ou Email já registado' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    create(@Body() dto: CreatePreRegistrationDto, @Req() req: any) {
        const usuarioLogado = req.user;
        return this.service.create(dto, usuarioLogado.sub);

    }

    // ─────────────────────────────────────────────
    //  FIND ALL (com paginação e filtros)
    // ─────────────────────────────────────────────
    @Get()
    @ApiOperation({ summary: 'Listar pré-inscrições com filtros e paginação' })
    @ApiResponse({ status: 200, description: 'Lista de pré-inscrições retornada' })
    findAll(@Query() query: QueryPreRegistrationDto) {
        return this.service.findAll(query);
    }

    // ─────────────────────────────────────────────
    //  FIND ONE
    // ─────────────────────────────────────────────
    @Get(':codigo')
    @ApiOperation({ summary: 'Buscar pré-inscrição por código' })
    @ApiResponse({ status: 200, description: 'Pré-inscrição encontrada' })
    @ApiResponse({ status: 404, description: 'Pré-inscrição não encontrada' })
    @ApiParam({ name: 'codigo', type: Number })
    findOne(@Param('codigo', ParseIntPipe) codigo: number) {
        return this.service.findOne(codigo);
    }

    // ─────────────────────────────────────────────
    //  FIND BY BI
    // ─────────────────────────────────────────────
    @Get('bi/:bi')
    @ApiOperation({ summary: 'Buscar pré-inscrição por Bilhete de Identidade' })
    @ApiResponse({ status: 200, description: 'Pré-inscrição encontrada' })
    @ApiResponse({ status: 404, description: 'Pré-inscrição não encontrada' })
    findByBI(@Param('bi') bi: string) {
        return this.service.findByBI(bi);
    }

    // ─────────────────────────────────────────────
    //  UPDATE
    // ─────────────────────────────────────────────
    @Patch(':codigo')
    @ApiOperation({ summary: 'Atualizar pré-inscrição' })
    @ApiResponse({ status: 200, description: 'Pré-inscrição atualizada com sucesso' })
    @ApiResponse({ status: 404, description: 'Pré-inscrição não encontrada' })
    @ApiResponse({ status: 409, description: 'BI ou Email já em uso por outro registo' })
    update(
        @Param('codigo', ParseIntPipe) codigo: number,
        @Body() dto: UpdatePreRegistrationDto,
    ) {
        return this.service.update(codigo, dto);
    }

    // ─────────────────────────────────────────────
    //  MUDAR ESTADO
    // ─────────────────────────────────────────────
    @Patch(':codigo/estado')
    @ApiOperation({ summary: 'Alterar estado da pré-inscrição' })
    @ApiResponse({ status: 200, description: 'Estado alterado com sucesso' })
    changeEstado(
        @Param('codigo', ParseIntPipe) codigo: number,
        @Body('estado') estado: string,
        @Body('observacao') obs?: string,
    ) {
        return this.service.changeEstado(codigo, estado, obs);
    }

    // ─────────────────────────────────────────────
    //  TOGGLE PERMITIR INSCRIÇÃO
    // ─────────────────────────────────────────────
    @Patch(':codigo/permitir-inscricao')
    @ApiOperation({ summary: 'Permitir ou bloquear inscrição' })
    @ApiResponse({ status: 200, description: 'Permissão atualizada com sucesso' })
    togglePermitirInscricao(
        @Param('codigo', ParseIntPipe) codigo: number,
        @Body('permitir') permitir: boolean,
    ) {
        return this.service.togglePermitirInscricao(codigo, permitir);
    }

    // ─────────────────────────────────────────────
    //  DELETE
    // ─────────────────────────────────────────────
    @Delete(':codigo')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Remover pré-inscrição' })
    @ApiResponse({ status: 204, description: 'Pré-inscrição removida com sucesso' })
    @ApiResponse({ status: 404, description: 'Pré-inscrição não encontrada' })
    remove(@Param('codigo', ParseIntPipe) codigo: number) {
        return this.service.remove(codigo);
    }

    // ─── Ficha de inscrição completa ───────────────────────────────────────────
    @Get('ficha/:userId')
    @ApiOperation({
        summary: 'Ficha de inscrição completa do candidato',
        description:
            'Retorna todos os dados agregados do utilizador + pré-inscrição + cursos + turnos + ano lectivo + polo + necessidade especial.',
    })
    @ApiParam({ name: 'userId', type: Number, description: 'ID do utilizador (FK2_USERS.ID)' })
    @ApiResponse({ status: 200, description: 'Ficha de inscrição' })
    @ApiResponse({ status: 404, description: 'Candidato não encontrado' })
    getFichaInscricao(@Param('userId', ParseIntPipe) userId: number) {
        return this.service.getFichaInscricao(userId);
    }
    //@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
    @Get('candidatura/info-gerais')
    @ApiOperation({
        summary: 'Informações gerais do candidato (pre-inscrição + admissao + matricula + prova)',
        description:
            'Retorna dados do utilizador + status da pré-inscrição + estado de admissão + estado de matricula + situação da prova (agendada, realizada, etc).',
    })
    @ApiResponse({ status: 200, description: 'Dados do candidato' })
    @ApiResponse({ status: 404, description: 'Utilizador não encontrado' })
    getCandidaturaUserData(@Req() req: any) {
        // const usuarioLogado = req.user;
        return this.service.getCandidaturaUserData(123);
    }
}