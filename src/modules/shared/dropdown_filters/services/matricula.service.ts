import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { toLowerCaseKeys } from "src/modules/util/toLowerCaseKeys";
import { DataSource } from "typeorm";


@Injectable()
export class MatriculaService {
    constructor(private readonly dataSource: DataSource) { }
   async estadoMatriculaDropdown() {
  const resultado = await this.dataSource.createQueryBuilder()
    .select("TM.CODIGO", "codigo")
    .addSelect("TM.DESIGNACAO", "designacao")
    .from("FK2_TB_ESTADO_MATRICULA", "TM")
    .where("TM.ACTIVESTATE = :activo", { activo: 1 })
    .getRawMany();
  return resultado ? toLowerCaseKeys(resultado) : null;
}
}