
import { DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { TypeAvaliation, TypePromptEnum } from './util/enum/prompt';
@Injectable()
export class promptToCreateAndEditService {
  constructor(private readonly dataSource: DataSource) { }
  

// Prazo para criacao e edicao de Horarios
 async promptToCreateAndEditSchedule(
  ano_lectivo: number,
): Promise<any> {
  const promptToCreateAndEdit = await this.promptToCreateAndEdit(TypePromptEnum.CRIACAO_HORARIO, ano_lectivo);
 return  toLowerCaseKeys(promptToCreateAndEdit);
}
 // Prazo para criacao de Provas
async promptToCreateAnExam(ano_lectivo?: number, semestre?: number, type_avaliation?: number): Promise<any> {
  const promptToCreateAnExam = await this.promptToCreateAndEdit(TypePromptEnum.MARCACAO_PROVAS, ano_lectivo, semestre, type_avaliation);
  return toLowerCaseKeys(promptToCreateAnExam);

 
} 
 // Prazo para criacao e edicao de Pautas
 async promptToCreateAndEditPauta(ano_lectivo?: number, semestre?: number,type_avaliation?: number): Promise<any> {
  const promptToCreateAndEditPauta = await this.promptToCreateAndEdit(TypePromptEnum.LANCAMENTO_NOTAS, ano_lectivo, semestre, type_avaliation);
  return toLowerCaseKeys(promptToCreateAndEditPauta);
 
} 
 // Prazo para criacao e edicao de Notas
 async promptToCreateAndEditGrades(ano_lectivo?: number, semestre?: number, type_avaliation?: number) {
  const promptToCreateAndEditGrades = await this.promptToCreateAndEdit(TypePromptEnum.LANCAMENTO_NOTAS, ano_lectivo, semestre, type_avaliation);
  return toLowerCaseKeys(promptToCreateAndEditGrades);
 
} 
 // Prazo para criacao e edicao de Presencas
 async promptToCreateAndEditAttendance() {
 
}
// Prazo para criacao e edicao de Deeadlines
async promptToCreateAndEditDeadline() {
 
} 

private async promptToCreateAndEdit(
  sigla_prazo: string,
  ano_lectivo?: number,
  semestre?: number,  
  type_avaliation?: number,         
): Promise<any> {
  let query = `
    SELECT p.DATA_INICIO, p.DATA_FIM, p.PK_PRAZO, p.OBSERVACAO, 
           p.FK_TIPO_PRAZO, tp.DESIGNACAO AS TIPO_PRAZO_NOME,
           tp.SIGLA AS TIPO_PRAZO_SIGLA, 
           av.DESIGNACAO AS TIPO_AVALIACAO_NOME
    FROM FK2_MCAL_TB_PRAZO p
    LEFT JOIN FK2_MCAL_TB_TIPO_PRAZO tp ON tp.PK_TIPO_PRAZO = p.FK_TIPO_PRAZO
    LEFT JOIN FK2_MCAL_TB_TIPO_AVALIACAO av ON av.PK_TIPO_AVALIACAO = p.FK_TIPO_AVALIACAO
    WHERE tp.SIGLA = :sigla_prazo
      AND p.FK_ANO_LECTIVO = :ano_lectivo
  `;

  const params: any = { sigla_prazo, ano_lectivo };

  if (semestre !== undefined) {
    query += ` AND p.FK_SEMESTRE = :semestre`;
    params.semestre = semestre;
  }

  if (type_avaliation !== undefined) {
    query += ` AND av.PK_TIPO_AVALIACAO = :type_avaliation`;
    params.type_avaliation = type_avaliation;
  }

  query += ` ORDER BY p.PK_PRAZO DESC FETCH FIRST 1 ROWS ONLY`;

  const result = await this.dataSource.query(query, params);
  return result[0] || null;
}


} 