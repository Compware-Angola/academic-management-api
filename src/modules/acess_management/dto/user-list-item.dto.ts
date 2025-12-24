// src/users/dto/user-list-item.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UserListItemDto {
  @ApiProperty() pkUtilizador: number;
  @ApiProperty() nome: string;
  @ApiProperty() username: string;
  @ApiProperty() email?: string;
  @ApiProperty() active: boolean;
  @ApiProperty({ example: { personId: 456, personName: 'João Silva' } }) 
  refPessoa?: any;      // JSON parseado
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(data: any) {
    this.pkUtilizador = data.PK_UTILIZADOR;
    this.nome = data.NOME;
    this.username = data.USERNAME;
    this.email = data.EMAIL || null;
    this.active = !!data.ACTIVE_STATE;
    this.createdAt = data.CREATED_AT;
    this.updatedAt = data.UPDATED_AT;

    try {
      this.refPessoa = JSON.parse(data.REF_PESSOA || '{}');
    } catch {
      this.refPessoa = null;
    }
  }
}