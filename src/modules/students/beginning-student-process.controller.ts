import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Put } from "@nestjs/common";
import { BeginningStudentProcessService } from "./beginning-student-process.service";
import { ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import { CreateUserDto } from "./dto/create-user.dto";
import { BlockUserDto } from "./dto/block-user";
import { UpdateUserDto } from "./dto/update-user.dto";

@Controller('beginning-student-process')
export class BeginningStudentProcessController {
    constructor(private readonly service: BeginningStudentProcessService) { }

    // ─────────────────────────────────────────────
    //  POST /users  →  Criar utilizador
    // ─────────────────────────────────────────────
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Criar novo utilizador' })
    @ApiResponse({ status: 201, description: 'Utilizador criado com sucesso' })
    @ApiResponse({ status: 409, description: 'E-mail ou username já em uso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    create(@Body() dto: CreateUserDto) {
        return this.service.create(dto);

    }

    @Get(':id')
    @ApiOperation({ summary: 'Obter detalhe de um utilizador por ID' })
    @ApiParam({ name: 'id', type: Number, description: 'ID do utilizador' })
    @ApiResponse({ status: 200, description: 'Dados do utilizador' })
    @ApiResponse({ status: 404, description: 'Utilizador não encontrado' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.service.findOne(id);
    }
    // ─────────────────────────────────────────────
    //  PUT /users/:id  →  Actualizar utilizador (completo)
    // ─────────────────────────────────────────────
    @Put(':id')
    @ApiOperation({ summary: 'Actualizar dados de um utilizador' })
    @ApiParam({ name: 'id', type: Number, description: 'ID do utilizador' })
    @ApiResponse({ status: 200, description: 'Utilizador actualizado com sucesso' })
    @ApiResponse({ status: 404, description: 'Utilizador não encontrado' })
    @ApiResponse({ status: 409, description: 'E-mail ou username já em uso' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateUserDto,
    ) {
        return this.service.update(id, dto);
    }

    // ─────────────────────────────────────────────
    //  PATCH /users/:id  →  Actualização parcial
    // ─────────────────────────────────────────────
    @Patch(':id')
    @ApiOperation({ summary: 'Actualização parcial de um utilizador' })
    @ApiParam({ name: 'id', type: Number, description: 'ID do utilizador' })
    @ApiResponse({ status: 200, description: 'Utilizador actualizado com sucesso' })
    patch(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateUserDto,
    ) {
        return this.service.update(id, dto);
    }

    // ─────────────────────────────────────────────
    //  DELETE /users/:id  →  Remoção lógica
    // ─────────────────────────────────────────────
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Remover utilizador (soft delete — STATUS_=0)' })
    @ApiParam({ name: 'id', type: Number, description: 'ID do utilizador' })
    @ApiResponse({ status: 200, description: 'Utilizador removido com sucesso' })
    @ApiResponse({ status: 404, description: 'Utilizador não encontrado' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.service.remove(id);
    }

    // ─────────────────────────────────────────────
    //  PATCH /users/:id/block  →  Bloquear
    // ─────────────────────────────────────────────
    @Patch(':id/block')
    @ApiOperation({ summary: 'Bloquear utilizador' })
    @ApiParam({ name: 'id', type: Number, description: 'ID do utilizador' })
    @ApiResponse({ status: 200, description: 'Utilizador bloqueado' })
    block(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: BlockUserDto,
    ) {
        return this.service.block(id, dto);
    }

    // ─────────────────────────────────────────────
    //  PATCH /users/:id/unblock  →  Desbloquear
    // ─────────────────────────────────────────────
    @Patch(':id/unblock')
    @ApiOperation({ summary: 'Desbloquear utilizador' })
    @ApiParam({ name: 'id', type: Number, description: 'ID do utilizador' })
    @ApiResponse({ status: 200, description: 'Utilizador desbloqueado' })
    unblock(@Param('id', ParseIntPipe) id: number) {
        return this.service.unblock(id);
    }

    // ─────────────────────────────────────────────
    //  PATCH /users/:id/verify-email  →  Verificar e-mail
    // ─────────────────────────────────────────────
    @Patch(':id/verify-email')
    @ApiOperation({ summary: 'Marcar e-mail do utilizador como verificado' })
    @ApiParam({ name: 'id', type: Number, description: 'ID do utilizador' })
    @ApiResponse({ status: 200, description: 'E-mail verificado com sucesso' })
    verifyEmail(@Param('id', ParseIntPipe) id: number) {
        return this.service.verifyEmail(id);
    }


}