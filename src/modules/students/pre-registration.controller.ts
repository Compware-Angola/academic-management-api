import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { PreRegistrationService } from "./pre-registration.service";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { CreatePreRegistrationDto } from "./dto/create-pre-inscricao.dto";

@Controller('pre-inscricoes')
export class PreRegistrationController {
    constructor(private readonly service: PreRegistrationService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Criar pré-inscrição' })
    @ApiResponse({ status: 201, description: 'Pré-inscrição criada com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    create(@Body() dto: CreatePreRegistrationDto) {
        return this.service.create(dto);
    }
}