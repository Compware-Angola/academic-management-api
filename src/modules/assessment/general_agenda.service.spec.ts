import { DataSource } from 'typeorm';
import { GenaralAgendaService } from './general_agenda.service';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { EstadoAvaliacaoEnum } from './types/types';

describe('GenaralAgendaService - processarNotasHorario / processarNotasTurma', () => {
  const ANO_ATUAL = 2026;

  let service: GenaralAgendaService;
  let dataSource: Partial<DataSource>;
  let anoLectivoUtil: Partial<AnoLectivoUtil>;

  const baseGradeAluno = (overrides: Record<string, any> = {}) => ({
    CODIGO: 1,
    CODIGO_MATRICULA: 100,
    CODIGO_CURSO: 10,
    CODIGO_GRADE_CURRICULAR: 20,
    CODIGO_GRADE_CURRICULA: 20,
    CODIGO_ANO_LECTIVO: ANO_ATUAL,
    CODIGO_SEMESTRE: 1,
    CLASSE: '10ª Classe',
    DISCIPLINA: 'Matemática',
    DURACAO_PLANO: '1 Ano',
    SEMESTRE: '1º Semestre',
    NOME_COMPLETO: 'Aluno Teste',
    NOTA: null,
    ...overrides,
  });

  const avaliacao = (tipo: number, nota: number) => ({
    TIPO_AVALIACAO: tipo,
    NOTA: nota,
  });

  beforeEach(() => {
    dataSource = { query: jest.fn() };
    anoLectivoUtil = { getAnoAtualId: jest.fn().mockResolvedValue(ANO_ATUAL) };
    service = new GenaralAgendaService(
      dataSource as DataSource,
      anoLectivoUtil as AnoLectivoUtil,
    );
    (service as any).anoAtualPrincipal = ANO_ATUAL;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const METHODS = [
    { metodo: 'processarNotasHorario', lancadaMetodo: 'temNotaLancadaNoHorario' },
    { metodo: 'processarNotasTurma', lancadaMetodo: 'temNotaLancadaNaTurma' },
  ];

  describe.each(METHODS)('$metodo', ({ metodo, lancadaMetodo }) => {
    const processar = (gradeAluno: any) =>
      (service as any)[metodo](100, gradeAluno);

    // REGRA 1 — Ano lectivo histórico ------------------------------------------------

    it('1) ano lectivo anterior ao activo com NOTA >= 10 aprova sem calcular fórmula', async () => {
      jest.spyOn(service as any, 'buscarAvaliacoes').mockResolvedValue([]);
      const findPlano = jest
        .spyOn(service as any, 'findOnePlanoByCursoAndAnoLectivo')
        .mockResolvedValue(undefined);

      const pauta = await processar(
        baseGradeAluno({ CODIGO_ANO_LECTIVO: ANO_ATUAL - 1, NOTA: 12 }),
      );

      expect(pauta.resultado).toBe(EstadoAvaliacaoEnum.APROVADO);
      expect(pauta.media).toBe('12');
      expect(pauta.formula).toEqual([]);
      expect(findPlano).not.toHaveBeenCalled();
    });

    it('2) ano lectivo anterior ao activo com NOTA < 10 reprova sem calcular fórmula', async () => {
      jest.spyOn(service as any, 'buscarAvaliacoes').mockResolvedValue([]);
      const findPlano = jest
        .spyOn(service as any, 'findOnePlanoByCursoAndAnoLectivo')
        .mockResolvedValue(undefined);

      const pauta = await processar(
        baseGradeAluno({ CODIGO_ANO_LECTIVO: ANO_ATUAL - 1, NOTA: 8 }),
      );

      expect(pauta.resultado).toBe(EstadoAvaliacaoEnum.REPROVADO);
      expect(pauta.media).toBe('8');
      expect(pauta.formula).toEqual([]);
      expect(findPlano).not.toHaveBeenCalled();
    });

    it('3) ano lectivo anterior ao activo com NOTA nula cai no fluxo normal de cálculo', async () => {
      jest.spyOn(service as any, 'buscarAvaliacoes').mockResolvedValue([]);
      const findPlano = jest
        .spyOn(service as any, 'findOnePlanoByCursoAndAnoLectivo')
        .mockResolvedValue(undefined);

      const pauta = await processar(
        baseGradeAluno({ CODIGO_ANO_LECTIVO: ANO_ATUAL - 1, NOTA: null }),
      );

      expect(findPlano).toHaveBeenCalled();
      expect(pauta.resultado).toBe(EstadoAvaliacaoEnum.REPROVADO);
      expect(pauta.obs).toContain('O estudante não teve nenhuma nota lançada;');
    });

    // REGRA 2 — TEM_PRATICA / TEM_ORAL vindos do plano --------------------------------

    describe('fluxo de acordo com o plano curricular', () => {
      beforeEach(() => {
        jest.spyOn(service as any, lancadaMetodo).mockResolvedValue(true);
        jest
          .spyOn(service as any, 'findOnePlanoByCursoAndAnoLectivo')
          .mockResolvedValue({ CODIGO: 1 });
      });

      it('4) TEM_ORAL=true, oral ausente entra como 0 e, se insuficiente, cai no Recurso (também sem notas = 0)', async () => {
        jest
          .spyOn(service as any, 'buscarAvaliacoes')
          .mockResolvedValue([avaliacao(2, 9), avaliacao(3, 9)]);
        jest
          .spyOn(service as any, 'findByPlanoAndUnidadeCurricular')
          .mockResolvedValue({ TEM_ORAL: true, TEM_PRATICA: false });

        const pauta = await processar(baseGradeAluno());

        // (9+9+0)/3=6 -> insuficiente -> RECURSO; sem notas de recurso, (0+0)/2=0
        expect(pauta.media).toBe('0');
        expect(pauta.resultado).toBe(EstadoAvaliacaoEnum.REPROVADO);
        expect(
          pauta.obs.some((o: string) => o.includes('considerada 0')),
        ).toBe(true);
      });

      it('4b) TEM_ORAL=true, nota oral baixa mas média combinada (1ªF+2ªF+Oral)/3 aprova', async () => {
        jest
          .spyOn(service as any, 'buscarAvaliacoes')
          .mockResolvedValue([
            avaliacao(2, 12),
            avaliacao(3, 12),
            avaliacao(9, 6),
          ]);
        jest
          .spyOn(service as any, 'findByPlanoAndUnidadeCurricular')
          .mockResolvedValue({ TEM_ORAL: true, TEM_PRATICA: false });

        const pauta = await processar(baseGradeAluno());

        // (12+12+6)/3 = 10
        expect(pauta.media).toBe('10');
        expect(pauta.resultado).toBe(EstadoAvaliacaoEnum.APROVADO);
      });

      it('5) TEM_PRATICA=true, prática ausente entra como 0 e reprova sem direito a recurso', async () => {
        jest
          .spyOn(service as any, 'buscarAvaliacoes')
          .mockResolvedValue([avaliacao(2, 10), avaliacao(3, 10)]);
        jest
          .spyOn(service as any, 'findByPlanoAndUnidadeCurricular')
          .mockResolvedValue({ TEM_ORAL: false, TEM_PRATICA: true });

        const pauta = await processar(baseGradeAluno());

        // (10+10+0)/3 = round(6.67) = 7 -> insuficiente -> RECURSO (nota seca,
        // prática não volta a contar); sem nota de recurso lançada -> REPROVADO
        expect(pauta.media).toBe('7');
        expect(pauta.resultado).toBe(EstadoAvaliacaoEnum.REPROVADO);
        expect(
          pauta.obs.some((o: string) => o.includes('considerada 0')),
        ).toBe(true);
        expect(
          pauta.obs.some((o: string) =>
            o.includes('não fez o lançamento da nota do recurso'),
          ),
        ).toBe(true);
      });

      it('5b) TEM_PRATICA=true, nota prática baixa mas média combinada (1ªF+2ªF+Prática)/3 aprova', async () => {
        jest
          .spyOn(service as any, 'buscarAvaliacoes')
          .mockResolvedValue([
            avaliacao(2, 12),
            avaliacao(3, 12),
            avaliacao(4, 6),
          ]);
        jest
          .spyOn(service as any, 'findByPlanoAndUnidadeCurricular')
          .mockResolvedValue({ TEM_ORAL: false, TEM_PRATICA: true });

        const pauta = await processar(baseGradeAluno());

        // (12+12+6)/3 = 10
        expect(pauta.media).toBe('10');
        expect(pauta.resultado).toBe(EstadoAvaliacaoEnum.APROVADO);
      });

      it('6) TEM_ORAL=false e TEM_PRATICA=false segue o fluxo geral', async () => {
        jest
          .spyOn(service as any, 'buscarAvaliacoes')
          .mockResolvedValue([avaliacao(2, 10), avaliacao(3, 10)]);
        jest
          .spyOn(service as any, 'findByPlanoAndUnidadeCurricular')
          .mockResolvedValue({ TEM_ORAL: false, TEM_PRATICA: false });

        const pauta = await processar(baseGradeAluno());

        expect(pauta.resultado).toBe(EstadoAvaliacaoEnum.APROVADO);
      });

      it('7) TEM_ORAL=true e TEM_PRATICA=true (cadastro incorrecto) prioriza oral e regista aviso', async () => {
        const warnSpy = jest
          .spyOn(console, 'warn')
          .mockImplementation(() => {});
        jest
          .spyOn(service as any, 'buscarAvaliacoes')
          .mockResolvedValue([avaliacao(2, 9), avaliacao(3, 9)]);
        jest
          .spyOn(service as any, 'findByPlanoAndUnidadeCurricular')
          .mockResolvedValue({ TEM_ORAL: true, TEM_PRATICA: true });

        const pauta = await processar(baseGradeAluno());

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('TEM_ORAL'),
        );
        expect(pauta.obs.some((o: string) => o.includes('Prova Oral'))).toBe(
          true,
        );
        expect(pauta.obs.some((o: string) => o.includes('Prática'))).toBe(
          false,
        );
      });
    });

    // REGRA 3 — fallback sem plano cadastrado ------------------------------------------

    it('8) planoCurricularCurso indefinido segue o fluxo geral sem lançar erro', async () => {
      jest
        .spyOn(service as any, lancadaMetodo)
        .mockImplementation(async (..._args: any[]) => {
          const tipo = _args[1];
          return tipo === 2 || tipo === 3;
        });
      jest
        .spyOn(service as any, 'buscarAvaliacoes')
        .mockResolvedValue([avaliacao(2, 10), avaliacao(3, 10)]);
      jest
        .spyOn(service as any, 'findOnePlanoByCursoAndAnoLectivo')
        .mockResolvedValue(undefined);
      const findGrade = jest.spyOn(
        service as any,
        'findByPlanoAndUnidadeCurricular',
      );

      const pauta = await processar(baseGradeAluno());

      expect(findGrade).not.toHaveBeenCalled();
      expect(pauta.resultado).toBe(EstadoAvaliacaoEnum.APROVADO);
    });

    it('9) planoCurricularGrade indefinido (grade sem registo no plano) segue o fluxo geral', async () => {
      jest
        .spyOn(service as any, lancadaMetodo)
        .mockImplementation(async (..._args: any[]) => {
          const tipo = _args[1];
          return tipo === 2 || tipo === 3;
        });
      jest
        .spyOn(service as any, 'buscarAvaliacoes')
        .mockResolvedValue([avaliacao(2, 10), avaliacao(3, 10)]);
      jest
        .spyOn(service as any, 'findOnePlanoByCursoAndAnoLectivo')
        .mockResolvedValue({ CODIGO: 1 });
      jest
        .spyOn(service as any, 'findByPlanoAndUnidadeCurricular')
        .mockResolvedValue(undefined);

      const pauta = await processar(baseGradeAluno());

      expect(pauta.resultado).toBe(EstadoAvaliacaoEnum.APROVADO);
    });

    // REGRA 5 — Recurso: Oral combina sempre (sem limiar), Prática não entra no recurso ---

    describe('Recurso com Oral/Prática', () => {
      beforeEach(() => {
        jest.spyOn(service as any, lancadaMetodo).mockResolvedValue(true);
        jest
          .spyOn(service as any, 'findOnePlanoByCursoAndAnoLectivo')
          .mockResolvedValue({ CODIGO: 1 });
      });

      it('11) Recurso com Oral combina sempre, mesmo com nota de recurso ausente', async () => {
        jest
          .spyOn(service as any, 'buscarAvaliacoes')
          .mockResolvedValue([
            avaliacao(2, 6),
            avaliacao(3, 6),
            avaliacao(23, 20),
          ]);
        jest
          .spyOn(service as any, 'findByPlanoAndUnidadeCurricular')
          .mockResolvedValue({ TEM_ORAL: true, TEM_PRATICA: false });

        const pauta = await processar(baseGradeAluno());

        // (6+6+0)/3=4 na frequência (oral ausente) -> insuficiente -> RECURSO;
        // notaRec ausente -> combina mesmo assim com a Oral de Recurso: (0+20)/2=10
        expect(pauta.media).toBe('10');
        expect(pauta.resultado).toBe(EstadoAvaliacaoEnum.APROVADO);
      });

      it('12) Recurso com Prática comporta-se como nota seca (prática não conta no recurso)', async () => {
        // 2ª Frequência e Exame não lançados -> RECURSO (única via para RECURSO
        // com hasPratica, já que Exame agora também é independente da média);
        // Prática não se aplica aqui, é nota seca.
        jest
          .spyOn(service as any, 'buscarAvaliacoes')
          .mockResolvedValue([avaliacao(7, 12)]);
        jest
          .spyOn(service as any, 'findByPlanoAndUnidadeCurricular')
          .mockResolvedValue({ TEM_ORAL: false, TEM_PRATICA: true });

        const pauta = await processar(baseGradeAluno());

        expect(pauta.media).toBe('12');
        expect(pauta.resultado).toBe(EstadoAvaliacaoEnum.APROVADO);
        expect(pauta.obs.some((o: string) => o.includes('seca'))).toBe(true);
      });

      it('12b) Prática insuficiente cai em Recurso (nota seca) e pode aprovar', async () => {
        jest
          .spyOn(service as any, 'buscarAvaliacoes')
          .mockResolvedValue([
            avaliacao(2, 6),
            avaliacao(3, 6),
            avaliacao(7, 14),
          ]);
        jest
          .spyOn(service as any, 'findByPlanoAndUnidadeCurricular')
          .mockResolvedValue({ TEM_ORAL: false, TEM_PRATICA: true });

        const pauta = await processar(baseGradeAluno());

        // (6+6+0)/3=4 -> insuficiente -> RECURSO; recurso é nota seca (14 >= 10)
        expect(pauta.media).toBe('14');
        expect(pauta.resultado).toBe(EstadoAvaliacaoEnum.APROVADO);
        expect(pauta.obs.some((o: string) => o.includes('seca'))).toBe(true);
      });

      it('13) Oral de Recurso ausente entra como 0, decide já e informa o utilizador', async () => {
        jest
          .spyOn(service as any, 'buscarAvaliacoes')
          .mockResolvedValue([
            avaliacao(2, 6),
            avaliacao(3, 6),
            avaliacao(7, 14),
          ]);
        jest
          .spyOn(service as any, 'findByPlanoAndUnidadeCurricular')
          .mockResolvedValue({ TEM_ORAL: true, TEM_PRATICA: false });

        const pauta = await processar(baseGradeAluno());

        // (14+0)/2 = 7
        expect(pauta.media).toBe('7');
        expect(pauta.resultado).toBe(EstadoAvaliacaoEnum.REPROVADO);
        expect(
          pauta.obs.some((o: string) => o.includes('considerada 0')),
        ).toBe(true);
      });
    });

    // REGRA 6 — Exame Especial com Oral: vai sempre para a Oral, independente da média ---

    describe('Exame Especial com Oral', () => {
      beforeEach(() => {
        jest.spyOn(service as any, lancadaMetodo).mockResolvedValue(true);
        jest
          .spyOn(service as any, 'findOnePlanoByCursoAndAnoLectivo')
          .mockResolvedValue({ CODIGO: 1 });
      });

      it('14) hasOral: vai para a Oral do Exame Especial mesmo com nota baixa (independente da média)', async () => {
        jest
          .spyOn(service as any, 'buscarAvaliacoes')
          .mockResolvedValue([avaliacao(11, 3), avaliacao(24, 20)]);
        jest
          .spyOn(service as any, 'findByPlanoAndUnidadeCurricular')
          .mockResolvedValue({ TEM_ORAL: true, TEM_PRATICA: false });

        const pauta = await processar(baseGradeAluno());

        // (3+20)/2 = 11.5 -> round = 12
        expect(pauta.media).toBe('12');
        expect(pauta.resultado).toBe(EstadoAvaliacaoEnum.APROVADO);
      });

      it('15) hasOral: Oral do Exame Especial ausente entra como 0 e informa o utilizador', async () => {
        jest
          .spyOn(service as any, 'buscarAvaliacoes')
          .mockResolvedValue([avaliacao(11, 15)]);
        jest
          .spyOn(service as any, 'findByPlanoAndUnidadeCurricular')
          .mockResolvedValue({ TEM_ORAL: true, TEM_PRATICA: false });

        const pauta = await processar(baseGradeAluno());

        // (15+0)/2 = 7.5 -> round = 8
        expect(pauta.media).toBe('8');
        expect(pauta.resultado).toBe(EstadoAvaliacaoEnum.REPROVADO);
        expect(
          pauta.obs.some((o: string) => o.includes('considerada 0')),
        ).toBe(true);
      });

      it('16) sem hasOral: Exame Especial continua nota seca', async () => {
        jest
          .spyOn(service as any, 'buscarAvaliacoes')
          .mockResolvedValue([avaliacao(11, 12)]);
        jest
          .spyOn(service as any, 'findByPlanoAndUnidadeCurricular')
          .mockResolvedValue({ TEM_ORAL: false, TEM_PRATICA: false });

        const pauta = await processar(baseGradeAluno());

        expect(pauta.media).toBe('12');
        expect(pauta.resultado).toBe(EstadoAvaliacaoEnum.APROVADO);
      });
    });
  });

  // REGRA 4 — cálculo de recurso oral combinado (partilhado pelos dois métodos) -----

  it('10) notaRec ausente entra como 0 no cálculo da média do recurso oral', () => {
    const media = (service as any).calcularMediaRecursoOral(undefined, {
      NOTA: 14,
    });

    expect(media).toBe(7);
  });

  it('10b) notaRec presente combina normalmente com a nota da oral de recurso', () => {
    const media = (service as any).calcularMediaRecursoOral(
      { NOTA: 8 },
      { NOTA: 14 },
    );

    expect(media).toBe(11);
  });
});
