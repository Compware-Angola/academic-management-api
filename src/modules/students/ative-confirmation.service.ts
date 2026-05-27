import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AnoLectivoUtil } from "../util/current-academic-year";

import * as oracledb from 'oracledb';

@Injectable()
export class AtiveConfirmationService {

    constructor(private readonly dataSource: DataSource, private readonly anoLectivoUtil: AnoLectivoUtil) { }

    async activeConfirmation(matricula: number) {
        const anoLetivo = await this.anoLectivoUtil.getAnoAtualId();
        const semestre = await this.anoLectivoUtil.getSemestreAtual();
        const student = await this.getStudent(matricula, anoLetivo, semestre.semestre || 1);
        if (!semestre.semestre) {
            throw new BadRequestException(`Ninguem pode confirmar no momento, estamos fora do periodo de confirmação,Semestre atual: ${anoLetivo} ${semestre.semestre} Fora dos Intervalos dos Semestres configurados`);
        }

        if (student === null) {
            //Vamos criar uma nova confirmação
            const nextClass = await this.getNextClass(Number(matricula));
            const canal = await this.getCanal(matricula) || 1;
            await this.createConfirmation(matricula, anoLetivo, semestre.semestre || 1, nextClass, canal);
            return { message: `Matricula ${matricula} confirmada com sucesso` };

        }
        if (student.ESTADO === 1) {
            throw new BadRequestException(`Confirmação já realizada para a Matricula ${matricula}`);
        }
        const studentSemestre = student?.SEMESTRE || 1;
        if (student.ESTADO === 0 && semestre?.semestre && semestre?.semestre > studentSemestre) {
            const nextClass = await this.getNextClass(Number(matricula));
            const canal = await this.getCanal(matricula) || 1;
            await this.createConfirmation(matricula, anoLetivo, semestre.semestre || 1, nextClass, canal);
            return { message: `Matricula ${matricula} confirmada com sucesso` };
        }

        const query = `UPDATE FK2_TB_CONFIRMACOES SET ESTADO = 1, SEMESTRE = :semestre WHERE CODIGO = :codigo`
        await this.dataSource.query(query, { codigo: student.CODIGO, semestre: semestre.semestre || 1 } as any);

        return { message: `Matricula ${matricula} confirmada com sucesso` };
    }


    private async getStudent(matricula: number, anoLetivo: number, semestre: number) {
        const query = `SELECT ESTADO,SEMESTRE,CODIGO FROM FK2_TB_CONFIRMACOES WHERE CODIGO_MATRICULA = :matricula AND CODIGO_ANO_LECTIVO = :anoLetivo AND SEMESTRE = :semestre
        ORDER BY SEMESTRE DESC
        FETCH FIRST 1 ROW ONLY
        `
        const result = await this.dataSource.query(query, { matricula, anoLetivo, semestre } as any);

        if (result.length === 0) {
            //Buscar sem o semestre
            const query2 = `SELECT ESTADO,SEMESTRE , CODIGO FROM FK2_TB_CONFIRMACOES WHERE CODIGO_MATRICULA = :matricula AND CODIGO_ANO_LECTIVO = :anoLetivo
            ORDER BY SEMESTRE DESC
            FETCH FIRST 1 ROW ONLY
            `
            const result2 = await this.dataSource.query(query2, { matricula, anoLetivo } as any);
            console.log(result2);
            if (result2.length > 0) {
                return result2[0];
            }
            return null;
        }

        return result[0];


    }
    private async createConfirmation(matricula: number, anoLetivo: number, semestre: number, classe: number, canal: number) {
        const result = await this.dataSource.query(
            `INSERT INTO FK2_TB_CONFIRMACOES (
             Codigo_Matricula, Data_Confirmacao,
             Codigo_Ano_lectivo, Estado, Classe,
             Cadeirante, canal, Semestre
          ) VALUES (
            :codMatricula, SYSDATE,
            :codAnoActual, 1, :classe,
            'NAO', :codCanal, :semestre
          ) RETURNING Codigo INTO :outId`,
            {
                codMatricula: matricula,
                codAnoActual: anoLetivo,
                classe,
                codCanal: canal,
                semestre,
                outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            } as any,
        );

        const codConfirmacao = result.outId[0];
        return { message: `Matricula ${matricula} confirmada com sucesso`, codConfirmacao };
    }
    private async getNextClass(matricula: number) {
        const query = `
        SELECT
            m.CODIGO,
            c.DURACAO,
            (
                SELECT cl.CODIGO
                FROM FK2_TB_GRADE_CURRICULAR_ALUNO ftgca
                LEFT JOIN FK2_TB_GRADE_CURRICULAR ftgc
                    ON ftgc.CODIGO = ftgca.CODIGO_GRADE_CURRICULAR
                LEFT JOIN FK2_TB_CLASSES cl
                    ON cl.CODIGO = ftgc.CODIGO_CLASSE
                WHERE ftgca.CODIGO_MATRICULA = m.CODIGO
                  AND ftgca.CODIGO_STATUS_GRADE_CURRICULAR IN (2, 3)
                
                GROUP BY cl.CODIGO, cl.DESIGNACAO
                ORDER BY COUNT(ftgca.CODIGO) DESC
                FETCH FIRST 1 ROWS ONLY
            ) AS CLASSE_CODIGO
        FROM FK2_TB_MATRICULAS m
        INNER JOIN FK2_TB_CURSOS c
            ON c.CODIGO = m.CODIGO_CURSO
        WHERE m.CODIGO = :matricula
        FETCH FIRST 1 ROW ONLY
    `;

        const result = await this.dataSource.query(query, { matricula } as any);
        console.log('Result =>', result);

        if (result.length === 0) {
            throw new BadRequestException(`Matrícula ${matricula} não encontrada`);
        }

        const classeAtual = result[0].CLASSE_CODIGO;
        const duracao = result[0].DURACAO;

        if (classeAtual === null || classeAtual === undefined) {
            return 1;
        }

        if (classeAtual >= duracao) {
            throw new BadRequestException(
                `Matrícula ${matricula} já atingiu a classe máxima (${duracao})`
            );
        }

        return classeAtual;
    }

    private async getCanal(matricula: number) {
        const query = `SELECT FK2_TB_MATRICULAS.CANAL FROM FK2_TB_MATRICULAS
        WHERE  FK2_TB_MATRICULAS.CODIGO= :matricula
        FETCH FIRST 1 ROW ONLY
        `;
        const result = await this.dataSource.query(query, { matricula } as any);

        if (result.length === 0) {
            return 1;
        }

        return result[0].CANAL;
    }


}
