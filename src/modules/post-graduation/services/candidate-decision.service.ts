// src/candidates/services/candidate-decision.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ApproveCandidateDto } from '../dto/approve-candidate.dto';
import { RejectCandidateDto } from '../dto/reject-candidate.dto';

@Injectable()
export class CandidateDecisionService {
  constructor(private readonly dataSource: DataSource) { }

  async approve(dto: ApproveCandidateDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verifica se já existe admissão para esta pré-inscrição
      const existing = await queryRunner.query(
        `SELECT CODIGO FROM FK2_TB_ADMISSAO WHERE PRE_INCRICAO = :preInscricao`,
        [dto.preInscricao],
      );

      if (existing.length > 0) {
        throw new BadRequestException(
          'Candidato já possui admissão registrada.',
        );
      }

      // Insere na tabela de admissão (PK gerada pelo trigger)
      await queryRunner.query(
        `INSERT INTO FK2_TB_ADMISSAO 
         (PRE_INCRICAO, MEDIAFINAL, DATA, RESULTADO, CANAL, POLO_ID)
         VALUES (:preInscricao, :mediaFinal, SYSDATE, :resultado, :canal, :poloId)`,
        [
          dto.preInscricao,
          dto.mediaFinal ?? null,
          dto.resultado ?? 'APROVADO',
          dto.canal ?? null,
          dto.poloId ?? null,
        ],
      );

      await queryRunner.commitTransaction();
      return { message: 'Candidato aprovado com sucesso.' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async reject(dto: RejectCandidateDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verifica se já existe rejeição ativa
      const existing = await queryRunner.query(
        `SELECT PK_REJEICAO_CANDIDATURA 
         FROM FK2_TB_REJEICAO_CANDIDATURA_ALUNO 
         WHERE FK_PREINSCRICAO = :preInscricao AND FK_ANOLECTIVO = :anoLectivo`,
        [dto.preInscricao, dto.anoLectivo],
      );

      if (existing.length > 0) {
        throw new BadRequestException(
          'Candidato já possui rejeição registrada.',
        );
      }

      // Insere rejeição (PK gerada pelo trigger)
      await queryRunner.query(
        `INSERT INTO FK2_TB_REJEICAO_CANDIDATURA_ALUNO 
         (FK_ANOLECTIVO, FK_PREINSCRICAO, FK_UTILIZADOR, MOTIVO, CREAT_AT, UPDATE_AT, ESTADO_REJEICAO)
         VALUES (:anoLectivo, :preInscricao, :utilizador, :motivo, SYSDATE, SYSDATE, :estadoRejeicao)`,
        [
          dto.anoLectivo,
          dto.preInscricao,
          dto.utilizador,
          dto.motivo,
          dto.estadoRejeicao ?? 1,
        ],
      );

      await queryRunner.commitTransaction();
      return { message: 'Candidato rejeitado com sucesso.' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
