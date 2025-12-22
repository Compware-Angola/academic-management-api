// src/users/referencias.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ReferenciasService } from './referencias.service';
import { ReferenciaDto } from '../shared/dto/referencia.dto';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('referencias')
@Controller('referencias')
export class ReferenciasController {
  constructor(private readonly referenciasService: ReferenciasService) {}

  @Get('estado-civil')
  @ApiOperation({ summary: 'Listar todos os estados civis' })
  @ApiResponse({ status: 200, type: [ReferenciaDto] })
  async findAllEstadoCivil(): Promise<ReferenciaDto[]> {
    return this.referenciasService.findAllEstadoCivil();
  }

  @Get('nacionalidades')
  @ApiOperation({ summary: 'Listar todas as nacionalidades' })
  @ApiResponse({ status: 200, type: [ReferenciaDto] })
  async findAllNacionalidades(): Promise<ReferenciaDto[]> {
    return this.referenciasService.findAllNacionalidades();
  }

  @Get('tipo-documentos')
  @ApiOperation({ summary: 'Listar todos os tipos de documentos' })
  @ApiResponse({ status: 200, type: [ReferenciaDto] })
  async findAllTipoDocumentos(): Promise<ReferenciaDto[]> {
    return this.referenciasService.findAllTipoDocumentos();
  }

  @Get('sexo')
  @ApiOperation({ summary: 'Listar todos os sexos/géneros' })
  @ApiResponse({ status: 200, type: [ReferenciaDto] })
  async findAllSexo(): Promise<ReferenciaDto[]> {
    return this.referenciasService.findAllSexo();
  }
}