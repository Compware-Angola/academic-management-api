import {
    IsEmail,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoUser } from './create-user.dto';
import { Type } from 'class-transformer';

export class UpdateUserDto {
    @ApiPropertyOptional({ example: 'João Silva', description: 'Nome completo do utilizador' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({ example: '+244923456789', description: 'Número de telefone' })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    telefone?: string;

    @ApiPropertyOptional({ example: 'joao.silva@email.com', description: 'Endereço de e-mail' })
    @IsOptional()
    @IsEmail({}, { message: 'E-mail inválido' })
    @MaxLength(255)
    email?: string;

    @ApiPropertyOptional({
        example: 0,
        description: 'Tipo de documento de identificação',
    })
    @IsOptional()
    @IsNumber()
    tipo_de_documento?: number;

    @ApiPropertyOptional({ example: '004567890LA042', description: 'Número do documento de identificação' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    numero_documento?: string;

    @ApiPropertyOptional({ example: 'joao.silva', description: 'Nome de utilizador único' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    username?: string;

    @ApiPropertyOptional({ example: 'NovaSenha@456', description: 'Nova palavra-passe (mín. 8 caracteres)' })
    @IsOptional()
    @IsString()
    @MinLength(8, { message: 'A palavra-passe deve ter no mínimo 8 caracteres' })
    @MaxLength(255)
    password?: string;

    @ApiPropertyOptional({
        example: 1,
        description: 'Canal de origem do registo',
    })
    @IsOptional()
    @IsNumber()
    canal?: number;


    @ApiPropertyOptional({
        example: "Mestrado",
        description: 'Grau académico do utilizador',
    })
    @IsOptional()
    @IsString()
    @Type(() => String)
    grauacademico?: string;

    @ApiPropertyOptional({ example: 'Faculdade de Ciências', description: 'Faculdade de pertença' })
    @IsOptional()
    @IsString()
    faculdade?: string;

    @ApiPropertyOptional({
        enum: EstadoUser,
        example: EstadoUser.ACTIVO,
        description: 'Estado da conta do utilizador',
    })
    @IsOptional()
    @IsEnum(EstadoUser, { message: 'Estado inválido' })
    estado?: EstadoUser;

    @ApiPropertyOptional({ example: 'Conta suspensa por inactividade', description: 'Motivo de bloqueio (se aplicável)' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    motivo_bloqueio?: string;

    @ApiPropertyOptional({ example: 1, description: 'ID do ano lectivo' })
    @IsOptional()
    @IsNumber()
    ano_lectivo_id?: number;

    @ApiPropertyOptional({ example: 'https://cdn.exemplo.com/foto.jpg', description: 'URL da foto de perfil' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    foto?: string;
}