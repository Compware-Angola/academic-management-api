import { Module } from "@nestjs/common";
import { PrazosService } from "./prazos.service";

@Module({
    imports: [],
    controllers: [],
    providers: [PrazosService],
    exports: [],
})
export class PrazosModule {}