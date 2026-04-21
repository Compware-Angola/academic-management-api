import { Module } from "@nestjs/common";
import { CursosController } from "./cursos.controller";
import { CursosService } from "./cursos.service";

@Module({
    imports: [],
    controllers: [CursosController],
    providers: [CursosService],
    exports: [],
})
export class CursosModule {}