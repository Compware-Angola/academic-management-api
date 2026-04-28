import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';


export class BlockUserDto {
    @ApiPropertyOptional({ example: 'Violação dos termos de uso', description: 'Motivo do bloqueio' })
    @IsOptional()
    @IsString()
    motivo_bloqueio?: string;
}