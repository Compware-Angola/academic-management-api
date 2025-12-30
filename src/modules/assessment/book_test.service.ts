import { DataSource } from 'typeorm';
import { CreateCalendarioProvaDto } from './dto/CreateCalendarioProvaDto';
export  class BookTestService {
    constructor(private readonly dataSource: DataSource) { }
 
async createCalendarioProva(dto:CreateCalendarioProvaDto) {



    const ref_json_prazo = {
      "prazo_inicio": "2025-12-01T00:00:00",
      "prazo_fim": "2025-12-15T23:59:59"
    };
    const  ref_json_utilizador = {
      "usuario_id": 500,
      "nome_usuario": "Professor Exemplo"
    };
    const ref_json_horario = {
      "dia_semana": "Segunda-feira",
      "hora_inicio": "08:00",
      "hora_fim": "10:00"
    };
  const sql = `
    INSERT INTO FK2_TB_CALENDARIO_PROVA (
      CODIGO_CALENDARIO,
      CODIGO_TIPO_PROVA,
      CODIGO_MODALIDADE,
      CODIGO_TURMA,
      CODIGO_SALA,
      CODIGO_UTILIZADOR,
      CODIGO_PERIODO,
      CODIGO_DISCIPLINA,
      DATA_PROVA,
      DURACAOPROVA,
      HORA_TERMINO,
      HORA_PROVA,
      VIGILANTE,
      URL,
      ESTADO,
      REF_UTILIZADOR,
      REF_HORARIO,
      REF_PRAZO,
      CODIGO,
      CREATED_AT 
    ) VALUES (
      :codigoCalendario,
      :codigoTipoProva,
      :codigoModalidade,
      :codigoTurma,
      :codigoSala,
      :codigoUtilizador,
      :codigoPeriodo,
      :codigoDisciplina,
      TO_DATE(:dataProva, 'YYYY-MM-DD'),
      :duracaoProva,
      :horaTermino,
      :horaProva,
      :vigilante,
      :url,
      :estado,
      :refUtilizador,
      :refHorario,
      :refPrazo,
     
      SYSDATE
    )
  `;

  await this.dataSource.query(sql, {
    codigoCalendario: dto.codigoCalendario,              // exemplo: ID único do calendário
    codigoTipoProva: dto.codigoTipoProva,              // exemplo
    codigoModalidade: dto.codigoModalidade,             // exemplo
    codigoTurma: null,                 // exemplo: código da turma
    codigoSala: dto.codigoSala,                  // exemplo: código/número da sala
    codigoUtilizador: dto.codigoUtilizador,            // exemplo: ID do usuário/professor
    codigoPeriodo: dto.codigoPeriodo,                 // exemplo: período letivo
    codigoDisciplina: dto.codigoDisciplina,            // exemplo: código da disciplina
    dataProva: dto.dataProva,          // formato string, convertido com TO_DATE
    duracaoProva: dto.duracaoProva,                // exemplo: duração em minutos
    horaTermino: dto.horaTermino,             // string no formato HH24:MI
    horaProva: dto.horaProva,               // hora de início da prova
    vigilante: '',          // exemplo: nome do vigilante
    url: null,                        // ou 'https://exemplo.com/recursos'
    estado: 1,               // exemplo: 'Agendada', 'Realizada', 'Cancelada' etc.
    refUtilizador: ref_json_utilizador,              // referência opcional
    refHorario: ref_json_horario,                 // referência opcional
    refPrazo: ref_json_prazo                  // referência opcional
                       // exemplo: outro código identificador (talvez PK duplicado ou legado)
  } as any);
}


private async getPrazo(){
     const  sql = `select * from FK2_MCAL_TB_PRAZO 
where 1=1
and FK_TIPO_AVALIACAO = 2
and FK_SEMESTRE = 1
and FK_TIPO_PRAZO = 4
and FK_ANO_LECTIVO = 22
and ACTIVE_STATE = 1
and TIPO_CANDIDATURA = 1
fetch first 1 row only`;
const resultados = await this.dataSource.query(sql);
    return resultados[0];
} 

 }