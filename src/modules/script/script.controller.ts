import { Controller, Get, Post, Body, Patch, Param, Delete, ValidationPipe } from '@nestjs/common';
import { ScriptService } from './script.service';
import { CreateDiscountDto } from './dto/create-desconto.dto';

@Controller('script')
export class ScriptController {
  constructor(private readonly scriptService: ScriptService) { }

  @Post('create-discount')
  create_discount(@Body(ValidationPipe) createDiscountDto: CreateDiscountDto) {
    return this.scriptService.create_discount(createDiscountDto);
  }

}
