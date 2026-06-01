import { Body, Controller, Post } from "@nestjs/common";
import { ChangeShiftService } from "./change-shift.service";
import { IChangeShiftParams } from "./dto/change-shift-params.dto";



@Controller('/students/change-shift')
export class ChangeShiftController {
    constructor(private readonly service: ChangeShiftService) { }

    @Post()
    async changeShift(@Body() params: IChangeShiftParams) {
        return this.service.changeShift(params);
    }

}