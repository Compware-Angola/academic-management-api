import { Injectable } from '@nestjs/common';
import { CreateAcademicCalendarDto } from './dto/create-academic_calendar.dto';
import { UpdateAcademicCalendarDto } from './dto/update-academic_calendar.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { ViewMonthsDto } from './dto/view-months.dto';
import { DataSource } from 'typeorm';

@Injectable()
export class AcademicCalendarService {
     constructor(private readonly dataSource: DataSource) { }
async viewMonths(params: ViewMonthsDto) {
  let query = `
    SELECT 
      DESIGNACAO,
      ISENCAO,
      ORDEM_MES,
      ANO_LECTIVO,
      PRESTACAO,
      ACTIVO,
      ACTIVO_POSGRADUACAO,
      DATA_LIMITE,
      DATA_INICIAL,
      DATA_FINAL,
      DATA_FINAL_DESCONTO,
      SEMESTRE,
      SEMESTRE_POSGRADUACAO,
      ID
    FROM 
      FK2_MES_TEMP
    WHERE 
      ACTIVO = 1
      AND ANO_LECTIVO = :anoLectivo
  `;

  const parameters: any = {
    anoLectivo: params.anoLectivo,
  };

  // Filtro opcional de semestre
  if (params.semestre !== undefined && params.semestre !== null) {
    query += ` AND SEMESTRE = :semestre`;
    parameters.semestre = params.semestre;
  }

  query += `
    ORDER BY 
      ORDEM_MES ASC
  `; // Sem ; no final (Oracle + TypeORM)

  const result = await this.dataSource.query(query, Object.values(parameters));
  
  return toLowerCaseKeys(result);
}
}
