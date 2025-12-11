import { Injectable } from '@nestjs/common';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { DataSource } from 'typeorm';
import oracledb from 'oracledb';

// deletar passar para estaso 0 e as aulas que estao com este hotario mudar oestado tbm para 0
// Validar horario 
// Disponibilidade  1-diponivel 0-indisponivel
@Injectable()
export class ScheduleService {
  constructor(private readonly dataSource: DataSource) { }
  async create(userId: number, dto: CreateScheduleDto) {

    return await this.createOrUpdateHorario(userId, dto);
  }

  async update(userId: number, horarioIdParam: number, dto: UpdateScheduleDto) {
    return await this.createOrUpdateHorario(userId, dto, horarioIdParam);
  }

  async delete(userId: number, horarioIdParam: number) {

  }

  async validate(userId: number, horarioIdParam: number) {

  }
  async availability(userId: number, horarioIdParam: number) {


  }
  async findAll() {


  }
  async findAllDeleted() {


  }
  private async createOrUpdateHorario(
    userId: number = 1,
    dto: CreateScheduleDto,
    horarioIdParam?: number,

  ): Promise<any> {
    const {
      anoLectivo,
      semestre,
      periodo,
      curso,
      unidadeCurricular,
      designacao,
      capacidade = 30,
      turma,
      modalidade,
      tipoAula,
      apenasPrimeiroAno = false,
      estadoHorario = 1,
      aulas,
      obs = null
    } = dto;

    // === 1. Buscar dados descritivos ===
    const v_grade_curricular = await this.getGradeCurricular(unidadeCurricular);
    const v_desc_grade = await this.getDescricaoGradeCurricular(v_grade_curricular);
    const v_desc_periodo = await this.getDescricaoPeriodo(periodo);
    const v_desc_ano_lectivo = await this.getDescricaoAnoLectivo(anoLectivo);

    const escapeQuotes = (str: string) => str.replace(/"/g, '\\"');

    const v_json_grade = `{"pk":${v_grade_curricular},"desc":"${escapeQuotes(v_desc_grade)}","corLetra":"black"}`;
    const v_json_periodo = `{"pkPeriodo":${periodo},"desc":"${escapeQuotes(v_desc_periodo)}"}`;
    const v_json_ano_lectivo = `{"pk":${anoLectivo},"desc":"${escapeQuotes(v_desc_ano_lectivo)}","corLetra":"black"}`;

    // JSON dos docentes (array)
    const docentesJson: string[] = [];
    for (const aula of aulas) {
      const nomeDoc = await this.getNomeDocente(aula.docente);
      docentesJson.push(`{"pkDocente":${aula.docente},"nomeAbreviado":"${escapeQuotes(nomeDoc)}"}`);
    }
    const v_json_docentes = docentesJson.length > 0 ? `[${docentesJson.join(',')}]` : '[]';

    let horarioId: number;

    if (!horarioIdParam) {
      // ==================== INSERT ====================
      const result = await this.dataSource.query(`
      INSERT INTO fk2_mgh_tb_horario (
        DESIGNACAO,
        REF_GRADE_CURRICULAR,
        REF_PERIODICIDADE,
        REF_ANO_LECTIVO,
        REF_CURSOS_PERMITIDOS,
        REF_TURMA,
        FK_ESTADO_HORARIO_WF,
        OBS,
        CREATED_BY,
        LAST_UPDATED_BY,
        CREATED_AT,
        UPDATED_AT,
        ACTIVE_STATE,
        CAPACIDADE,
        APENASPRIMEIROANO,
        DIPONIVEL,
        HORARIO_REUTILIZADO,

        -- FKs como VARCHAR2
        FK_GRADE_CURRICULAR,
        FK_SEMESTRE,
        FK_ANO_LECTIVO,
        FK_CURSOS_PERMITIDOS,
        FK_PERIODO,
        FK_TURMA
      ) VALUES (
        :designacao,
        :refGrade,
        :refPeriodo,
        :refAnoLectivo,
        :refCursos,           -- mesmo JSON da grade (ou podes mudar se quiseres outro formato)
        :refTurma,
        :estadoHorario,
        :obs,
        :userId,
        :userId,
        SYSDATE,
        SYSDATE,
        1,                    -- ACTIVE_STATE
        :capacidade,
        :apenasPrimeiroAno,
        1,                    -- DIPONIVEL (disponível para alunos)
        0,                    -- HORARIO_REUTILIZADO (novo = 0)

        TO_CHAR(:gradeCurricular),
        TO_CHAR(:semestre),
        TO_CHAR(:anoLectivo),
        TO_CHAR(:curso),
        TO_CHAR(:periodo),
        TO_CHAR(:turma)
      ) RETURNING PK_HORARIO INTO :outId
    `, {
        designacao,
        refGrade: v_json_grade,
        refPeriodo: v_json_periodo,
        refAnoLectivo: v_json_ano_lectivo,
        refCursos: v_json_grade,
        refTurma: turma ? `{"pk":${turma}}` : null,
        estadoHorario,
        obs,
        userId,
        capacidade,
        apenasPrimeiroAno: apenasPrimeiroAno ? 1 : 0,
        gradeCurricular: v_grade_curricular,
        semestre,
        anoLectivo,
        curso,
        periodo,
        turma: turma || null,
        outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      } as any);
      // Pega o ID retornado
      horarioId = result.outId[0];

    } else {
      // ==================== UPDATE ====================
      horarioId = horarioIdParam;

      await this.dataSource.query(`
      UPDATE fk2_mgh_tb_horario
         SET DESIGNACAO              = :designacao,
             REF_GRADE_CURRICULAR    = :refGrade,
             REF_PERIODICIDADE       = :refPeriodo,
             REF_ANO_LECTIVO         = :refAnoLectivo,
             REF_CURSOS_PERMITIDOS   = :refCursos,
             REF_TURMA               = :refTurma,
             FK_ESTADO_HORARIO_WF    = :estadoHorario,
             OBS                     = :obs,
             LAST_UPDATED_BY         = :userId,
             UPDATED_AT              = SYSDATE,
             CAPACIDADE              = :capacidade,
             APENASPRIMEIROANO       = :apenasPrimeiroAno,

             FK_GRADE_CURRICULAR     = TO_CHAR(:gradeCurricular),
             FK_SEMESTRE             = TO_CHAR(:semestre),
             FK_ANO_LECTIVO          = TO_CHAR(:anoLectivo),
             FK_CURSOS_PERMITIDOS    = TO_CHAR(:curso),
             FK_PERIODO              = TO_CHAR(:periodo),
             FK_TURMA                = TO_CHAR(:turma)
       WHERE PK_HORARIO = :horarioId
    `, {
        designacao,
        refGrade: v_json_grade,
        refPeriodo: v_json_periodo,
        refAnoLectivo: v_json_ano_lectivo,
        refCursos: v_json_grade,
        refTurma: turma ? `{"pk":${turma}}` : null,
        estadoHorario,
        obs,
        userId,
        capacidade,
        apenasPrimeiroAno: apenasPrimeiroAno ? 1 : 0,
        gradeCurricular: v_grade_curricular,
        semestre,
        anoLectivo,
        curso,
        periodo,
        turma: turma || null,
        horarioId
      } as any);

      // Limpa aulas antigas
      await this.dataSource.query(`DELETE FROM fk2_mgh_tb_aula WHERE fk_horario = :1`, [horarioId]);
    }

    // === INSERIR AULAS DETALHADAS (tabela filha) ===
    for (const aula of aulas) {
      // Montar os JSONs de referência exatamente como no teu legado
      const nomeDocente = await this.getNomeDocente(aula.docente);
      const escape = (str: string) => str.replace(/"/g, '\\"');

      const ref_docente = `{"pkDocente":${aula.docente},"nome":"${escape(nomeDocente)}"}`;

      // REF_AULA: normalmente é algo como "TP - Terça 09:00-11:00"
      const ref_aula = `{"pk":${tipoAula},"desc":${modalidade} - ${this.diaSemanaParaTexto(aula.diaSemana)} ${aula.hora_inicio}-${aula.hora_fim}}`;

      // REF_SALA: se tiver sala, traz o código, senão "Por atribuir"
      const ref_sala = `{"pk":${aula.sala}},"desc":"TESTE"`;

      // REF_TURMAS_PARTICIPANTES: podes usar a turma do horário ou deixar vazio
      const ref_turmas = dto.turma ? `{"pk":${dto.turma}}` : null;

      await this.dataSource.query(`
    INSERT INTO FK2_MGH_TB_AULA (
      FK_HORARIO,
   
      FK_DIA_DA_SEMANA,
      FK_TIPO_AULA,
      FK_MODALIDADE,
      ORDEM,
      HORA_INICIO,
      HORA_TERMINO,
      REF_AULA,
      REF_SALA,
      REF_DOCENTE,
      REF_TURMAS_PARTICIPANTES,
      OBS,
      CREATED_BY,
      LAST_UPDATED_BY,
      CREATED_AT,
      UPDATED_AT,
      ACTIVE_STATE
    ) VALUES (
      :horarioId,
    
      :diaSemana,
      :fkTipoAula,
      :fkModalidade,
      :ordem,
      :horaInicio,
      :horaFim,
      :refAula,
      :refSala,
      :refDocente,
      :refTurmas,
      :obs,
      :userId,
      :userId,
      SYSDATE,
      SYSDATE,
      1
    )
  `, {
        horarioId,

        diaSemana: aula.diaSemana,           // 1=Seg, 2=Ter, etc.
        fkTipoAula: tipoAula,
        fkModalidade: modalidade,
        ordem: aula.ordemTempo || 1,
        horaInicio: aula.hora_inicio,         // ex: '0900'
        horaFim: aula.hora_fim,             // ex: '1100'

        refAula: ref_aula,
        refSala: ref_sala,
        refDocente: ref_docente,
        refTurmas: ref_turmas,
        obs: aula.obs || null,
        userId: userId || 1
      } as any);
    }
    const message = horarioIdParam
      ? "Horário atualizado com sucesso!"
      : "Horário criado com sucesso!";

    return { success: true, message, horarioId };
  }
  // 3) Buscar grade curricular (confirma existência)
  async getGradeCurricular(codigoUnidadeCurricular: number): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT codigo
     FROM fk2_tb_grade_curricular
     WHERE codigo = :codigo`,
      [codigoUnidadeCurricular]
    );

    if (!result || result.length === 0) {
      throw new Error(`Grade curricular não encontrada para o código ${codigoUnidadeCurricular}`);
    }


    return result[0].CODIGO as number;
  }
  // 4.1) Descrição da disciplina da grade curricular
  async getDescricaoGradeCurricular(codigoGrade: number): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT d.designacao
     FROM fk2_tb_grade_curricular gc
     INNER JOIN fk2_tb_disciplinas d ON gc.CODIGO_DISCIPLINA = d.codigo
     WHERE gc.codigo = :codigoGrade`,
      [codigoGrade]
    );

    if (!result || result.length === 0) {
      throw new Error(`Descrição da grade curricular não encontrada para o código ${codigoGrade}`);
    }


    return result[0].DESIGNACAO as string;
  }

  // 4.2) Descrição do período
  async getDescricaoPeriodo(codigoPeriodo: number): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT designacao
     FROM fk2_tb_periodos
     WHERE codigo = :codigoPeriodo`,
      [codigoPeriodo]
    );

    if (!result || result.length === 0) {
      throw new Error(`Período não encontrado para o código ${codigoPeriodo}`);
    }

    return result[0].DESIGNACAO as string;
  }

  // 4.3) Nome do docente
  async getNomeDocente(codigoDocente: number): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT nome
     FROM fk2_tb_docente
     WHERE CODIGO = :codigoDocente`,
      [codigoDocente]
    );

    if (!result || result.length === 0) {
      throw new Error(`Docente não encontrado para o código ${codigoDocente}`);
    }

    return result[0].NOME as string;
  }

  // 4.4) Descrição do ano lectivo
  async getDescricaoAnoLectivo(codigoAnoLectivo: number): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT designacao
     FROM FK2_TB_ANO_LECTIVO
     WHERE CODIGO = :codigoAnoLectivo`,
      [codigoAnoLectivo]
    );

    if (!result || result.length === 0) {
      throw new Error(`Ano lectivo não encontrado para o código ${codigoAnoLectivo}`);
    }

    return result[0].DESIGNACAO as string;
  }
  //
  private diaSemanaParaTexto(dia: number): string {
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return dias[dia] || 'Segunda';
  }

}
