import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { ParametrosService } from "./parametros.service";

@Controller('parametros')
export class ParametrosController {
    constructor(private readonly parametrosService: ParametrosService) { }
    @Get('')
    @HttpCode(HttpStatus.OK)
    async getParametros() {
        return this.parametrosService.getParametros();
    }
}