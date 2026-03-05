import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch } from "@nestjs/common";
import { ParametrosService } from "./parametros.service";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ListParametrosResponseDto, UpdateParametroDto } from "./dto/parametros.dto";

@Controller('sumario/parametros')
export class ParametrosController {
    constructor(private readonly parametrosService: ParametrosService) { }
   @Get('')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar todos os parâmetros' })
  @ApiResponse({ status: 200, type: ListParametrosResponseDto })
  async getParametros() {
    return this.parametrosService.getParametros();
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar o valor (args) de um parâmetro' })
  @ApiResponse({ status: 200, description: 'Atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos (valor deve ser number ou boolean)' })
  async updateParametro(
    @Param('id') id: number,
    @Body() updateDto: UpdateParametroDto,
  ) {
    return this.parametrosService.updateParametro(id, updateDto);
  }
}