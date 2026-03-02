import { PartialType } from '@nestjs/swagger';
import { CreateAssiduidadeDto } from './create-assiduidade.dto';

export class UpdateAssiduidadeDto extends PartialType(CreateAssiduidadeDto) {}
