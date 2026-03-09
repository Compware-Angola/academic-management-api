import { PartialType } from '@nestjs/swagger';
import { CreateBullDto } from './create-bull.dto';

export class UpdateBullDto extends PartialType(CreateBullDto) {}
