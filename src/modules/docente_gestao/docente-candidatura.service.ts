import { Injectable } from "@nestjs/common";
import { toLowerCaseKeys } from "src/modules/util/toLowerCaseKeys";
import { DataSource } from "typeorm";
import { FindDocenteCandidaturaDto } from "./dto/Find-docente-candidatura.dto";

@Injectable()
export class DocenteCandidaturaService {
    constructor(private readonly dataSource: DataSource) { }
 async listDocenteCandidatura(filters: FindDocenteCandidaturaDto) {
    const { limit = 10, page = 1, cursoFormacaoId, dataFim, dataInicio, estadoId, generoId, search, grauAcademicoId } = filters;
    const offset = (page - 1) * limit;

    const queryBuilder = this.dataSource.createQueryBuilder()
        .from("FK2_MGD_TB_CANDIDATURA", "MTC")
        .leftJoin("FK2_MGD_TB_FORMACAO_ACADEMICA", "MTFA", "MTFA.FK_CANDIDATURA = MTC.CODIGO")
        .leftJoin("FK2_TB_AREA_FORMACAO", "TAF", "TAF.CODIGO = MTFA.AREA_FORMACAO_ID")
        .innerJoin("FK2_TB_ESTADO_CANDIDATURA", "TEC", "TEC.CODIGO = MTC.FK_ESTADO_CANDIDATURA")
        .leftJoin("FK2_TB_PESSOA", "TP", "TP.PK_PESSOA = JSON_VALUE(MTC.FK_PESSOA, '$.pk_pessoa')")
        .leftJoin("FK2_TB_SEXO", "TS", "TS.CODIGO = TP.FK_GENERO")
        .leftJoin("FK2_TB_ESTADO_CIVIL", "TEC2", "TEC2.CODIGO = TP.FK_ESTADO_CIVIL")
        .leftJoin("FK2_TB_NACIONALIDADES", "TN", "TN.CODIGO = TP.FK_NACIONALIDADE")
        .innerJoin("FK2_TB_CURSO_AREA_FORMACOES", "TCAF", "TCAF.CODIGO = MTFA.CURSO_AREA_FORMACAO_ID");

    // --- BLOCO DE FILTROS (WHERE) ---

    // 1. Pesquisa por Nome (Com tratamento de acentos do Oracle)
    if (search) {
        queryBuilder.andWhere(
            `(
                TRANSLATE(UPPER(TP.NOME_COMPLETO), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOUUUUC') LIKE TRANSLATE(UPPER(:search), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOUUUUC')
                OR TP.NUM_DOC_IDENTIFICACAO LIKE :search
            )`,
            { search: `%${search}%` }
        );
    }

    // 2. Filtro de Curso
    if (cursoFormacaoId && cursoFormacaoId > 0) {
        queryBuilder.andWhere("MTFA.CURSO_AREA_FORMACAO_ID = :cursoFormacaoId", { cursoFormacaoId });
    }

    // 3. Filtro de Grau Académico
    if (grauAcademicoId && grauAcademicoId > 0) {
        queryBuilder.andWhere("MTC.GRAU_ACADEMICO = :grauAcademicoId", { grauAcademicoId });
    }

    // 4. Filtro de Estado
    if (estadoId && estadoId > 0) {
        queryBuilder.andWhere("TEC.CODIGO = :estadoId", { estadoId });
    }

    // 5. Filtro de Género
    if (generoId && generoId > 0) {
        queryBuilder.andWhere("TS.CODIGO = :generoId", { generoId });
    }

    // 6. Filtro de Datas
    if (dataInicio && dataFim) {
        queryBuilder.andWhere(
            "TRUNC(MTC.DATA_CANDIDATURA) BETWEEN TO_DATE(:dataInicio, 'DD/MM/YYYY') AND TO_DATE(:dataFim, 'DD/MM/YYYY')",
            { dataInicio, dataFim }
        );
    }

    // --- EXECUÇÃO ---

    // Clonamos o builder com os filtros já aplicados para contar o total real
   const countQuery = queryBuilder.clone().select("COUNT(DISTINCT MTC.CODIGO)", "total");

const selectColumns = {
        codigoCandidato: "MTC.CODIGO",
        pk_pessoa: "TP.PK_PESSOA",
        nomeCandidato: "TO_CHAR(TP.NOME_COMPLETO)",
        dataNascimento: "TP.DATA_DE_NASCIMENTO",
        email: "TO_CHAR(TP.EMAIL)",
        dataCandidatura: "MTC.DATA_CANDIDATURA",
        estado: "TO_CHAR(TEC.DESCRICAO)",
        sexo: "TO_CHAR(TS.DESIGNACAO)",
        estadoCivil: "TO_CHAR(TEC2.DESIGNACAO)",
        nacionalidade: "TO_CHAR(TN.DESIGNACAO)",
        numeroBI: "TO_CHAR(TP.NUM_DOC_IDENTIFICACAO)",
        
        // Usamos agregação aqui para não quebrar o GROUP BY
        areaFormacao: "MAX(TO_CHAR(TAF.DESIGNACAO))", 
        curso: "MAX(TO_CHAR(TCAF.DESIGNACAO))"
    };

const dataQuery = queryBuilder
        .select(Object.entries(selectColumns).map(([alias, col]) => `${col} AS "${alias}"`))
        .groupBy(`
            MTC.CODIGO, 
            TO_CHAR(TP.NOME_COMPLETO), 
            TP.PK_PESSOA, 
            TP.DATA_DE_NASCIMENTO, 
            TO_CHAR(TP.EMAIL), 
            MTC.DATA_CANDIDATURA, 
            TO_CHAR(TEC.DESCRICAO), 
            TO_CHAR(TS.DESIGNACAO), 
            TO_CHAR(TEC2.DESIGNACAO), 
            TO_CHAR(TN.DESIGNACAO), 
            TO_CHAR(TP.NUM_DOC_IDENTIFICACAO)
        `)
        .orderBy("TO_CHAR(TP.NOME_COMPLETO)", "ASC") 
        .offset(offset)
        .limit(limit)
        .getRawMany();

    const [countResult, data] = await Promise.all([
        countQuery.getRawOne(),
        dataQuery
    ]);

    const totalItems = Number(countResult?.total ?? countResult?.TOTAL ?? 0);

    return { 
        data: toLowerCaseKeys(data), 
        meta: { 
            total: totalItems, 
            limit: Number(limit), 
            page: Number(page),
            totalPages: Math.ceil(totalItems / limit)
        } 
    };
}
    
}

{
    /*


    public static List<CandidatoModel> findCandidatos(int codigoArea, int codigoGrau, int codigoEstado, String dataIn, String datFin, int genero, int curso) {
        ConnectDB con = null;

        System.out.println("codigoArea-- " + codigoArea);
        System.out.println("dataIn-- " + dataIn);
        System.out.println("datFin-- " + datFin);
        List<CandidatoModel> listaDeCandidatos = new ArrayList<>();
        int codigo = 0;

        try {
            con = new ConnectDB();
            con.setPrepareStatement("SELECT DISTINCT  mtc.Codigo  AS codigoCandidato,\n"
                    + "                          tp.nome_completo AS nomeCandidato,\n"
                    + "                          tp.pk_pessoa AS pk_pessoa,\n"
                    + "                          tp.data_de_nascimento AS dataNascimento,\n"
                    + "                          tp.email AS email,\n"
                    + "                           mtc.data_Candidatura AS dataCandidatura,\n"
                    + "                           mtc.data_Candidatura AS dataAtualizacao,\n"
                    + "                           tec.descricao AS estado,\n"
                    + "                           taf.Designacao AS areaFormacao,\n"
                    + "                           ts.Designacao AS sexo,\n"
                    + "                           tec2.Designacao AS estadoCivil,\n"
                    + "                           tn.Designacao AS nacionalidade,\n"
                    + "                           tp.num_doc_identificacao AS numeroBI, tcaf.designacao AS curso\n"
                    + "                           \n"
                    + "FROM mgd_tb_candidatura mtc\n"
                    + "LEFT  JOIN mgd_tb_formacao_academica mtfa  ON mtfa.fk_candidatura =mtc.Codigo \n"
                    + "LEFT JOIN tb_area_formacao taf ON taf.Codigo = mtfa.area_formacao_id \n"
                    + "INNER JOIN tb_estado_candidatura tec ON tec.codigo = mtc.fk_estado_candidatura \n"
                    + "LEFT JOIN tb_pessoa tp ON  tp.pk_pessoa  = JSON_EXTRACT(mtc.fk_pessoa , '$.pk_pessoa')\n"
                    + "LEFT JOIN tb_sexo ts ON ts.Codigo = tp.fk_genero \n"
                    + "LEFT JOIN tb_estado_civil tec2 ON tec2.Codigo = tp.fk_estado_civil \n"
                    + "LEFT JOIN tb_nacionalidades tn ON tn.Codigo = tp.fk_nacionalidade \n"
                    + "	INNER JOIN tb_curso_area_formacoes tcaf ON tcaf.codigo = mtfa.curso_area_formacao_id \n"
                    + "WHERE (taf.Codigo = ? OR ? = 0) AND (mtc.Grau_Academico = ? OR ? = 0) AND (tec.codigo = ? OR ? = 0) \n"
                    + " AND  (DATE(mtc.data_Candidatura) >= ? AND DATE(mtc.data_Candidatura) <=  ? ) AND (ts.codigo = ? OR ? = 0) AND (mtfa.curso_area_formacao_id = ? OR ? = 0) AND (tec.codigo != ?)  ORDER BY  tp.nome_completo ASC  \n"
                    + " ");

            int estadoEliminado = 10;
            con.getPrepareStatement().setInt(1, codigoArea);
            con.getPrepareStatement().setInt(2, codigoArea);
            con.getPrepareStatement().setInt(3, codigoGrau);
            con.getPrepareStatement().setInt(4, codigoGrau);
            con.getPrepareStatement().setInt(5, codigoEstado);
            con.getPrepareStatement().setInt(6, codigoEstado);
            con.getPrepareStatement().setString(7, dataIn);
            con.getPrepareStatement().setString(8, datFin);
            con.getPrepareStatement().setInt(9, genero);
            con.getPrepareStatement().setInt(10, genero);
            con.getPrepareStatement().setInt(11, curso);
            con.getPrepareStatement().setInt(12, curso);
            con.getPrepareStatement().setInt(13, estadoEliminado);

            System.out.println("sql --> " + con.getPrepareStatement());

            ResultSet rs = con.consultar();
            CandidatoModel modelo = null;
            while (rs.next()) {
                modelo = new CandidatoModel();
                modelo.setCodigoCandidato(rs.getInt("codigoCandidato"));
                modelo.setNomeCandidato(rs.getString("nomeCandidato"));
                modelo.setCodigoPessoa(rs.getInt("pk_pessoa"));
                modelo.setEmailCandidato(rs.getString("email"));
                modelo.setDataCandidato(rs.getDate("dataCandidatura"));
                modelo.setDataAtualizacao(rs.getDate("dataAtualizacao"));
                modelo.setDataNascimento(rs.getDate("dataNascimento"));
                modelo.setEstadoCandidato(rs.getString("estado"));
                modelo.setAreaCandidato(rs.getString("areaFormacao"));
                modelo.setGeneroCandidato(rs.getString("sexo"));
                modelo.setEstadoCivilCandidato(rs.getString("estadoCivil"));
                modelo.setPaisCandidato(rs.getString("nacionalidade"));
                modelo.setBiCandidato(rs.getString("numeroBI"));
                modelo.setCurso(rs.getString("curso"));
//                modelo.setGrauCandidato(rs.getString("grauAcademico"));
//                modelo.setUniversidadeCandidato(rs.getString("universidade"));
//                modelo.setAnoConclusaoCandidato(rs.getString("anoConclusao"));

                listaDeCandidatos.add(modelo);

            }
            System.out.println("QUERY--- " + con.getPrepareStatement());
            System.out.println(" LISTA SIZE() : " + listaDeCandidatos.size());

            for (CandidatoModel c : listaDeCandidatos) {
                System.out.println(" Nome: " + c.getNomeCandidato() + " " + c.getNome());
            }

        } catch (Exception ex) {
            ex.printStackTrace();
        } finally {
            if (con != null) {
                con.disconect();
            }
        }

        return listaDeCandidatos;
    }
*/
    }