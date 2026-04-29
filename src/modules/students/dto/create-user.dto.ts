import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';


export enum EstadoUser {
    ACTIVO = 'ACTIVO',
    INACTIVO = 'INACTIVO',
    BLOQUEADO = 'BLOQUEADO',
    PENDENTE = 'PENDENTE',
}

export class CreateUserDto {
    @ApiProperty({ example: 'João Silva', description: 'Nome completo do utilizador' })
    @IsNotEmpty({ message: 'O nome é obrigatório' })
    @IsString()
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({ example: '+244923456789', description: 'Número de telefone' })

    @IsString()
    @MaxLength(20)
    telefone: string;

    @ApiProperty({ example: 'joao.silva@email.com', description: 'Endereço de e-mail' })
    @IsNotEmpty({ message: 'O e-mail é obrigatório' })
    @IsEmail({}, { message: 'E-mail inválido' })
    @MaxLength(255)
    email: string;

    @ApiPropertyOptional({
        example: 0,
        description: 'Tipo de documento de identificação',
    })

    @IsNumber()
    tipo_de_documento?: number;

    @ApiPropertyOptional({ example: '004567890LA042', description: 'Número do documento de identificação' })

    @IsString()
    @MaxLength(50)
    numero_documento: string;

    @ApiProperty({ example: 'joao.silva', description: 'Nome de utilizador único' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    @Type(() => String)
    username?: string;

    @ApiProperty({ example: 'Senha@123', description: 'Palavra-passe (mín. 8 caracteres)' })
    @IsNotEmpty({ message: 'A palavra-passe é obrigatória' })
    @IsString()
    @MinLength(8, { message: 'A palavra-passe deve ter no mínimo 8 caracteres' })
    @MaxLength(255)
    password: string;

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

    @ApiPropertyOptional({ example: 'Faculdade de Engenharia', description: 'Faculdade de pertença' })
    @IsOptional()
    @IsString()
    faculdade?: string;
    @ApiPropertyOptional({
        enum: EstadoUser,
        example: EstadoUser.ACTIVO,
        description: 'Estado da conta do utilizador',
        default: EstadoUser.PENDENTE,
    })
    @IsOptional()
    @IsEnum(EstadoUser, { message: 'Estado inválido' })
    estado?: EstadoUser;

    @ApiPropertyOptional({ example: 1, description: 'ID do ano lectivo' })
    @IsOptional()
    @IsNumber()
    ano_lectivo_id?: number;
}