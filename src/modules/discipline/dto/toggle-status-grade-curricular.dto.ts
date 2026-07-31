// dto/toggle-status-grade-curricular.dto.ts
import { IsIn, IsInt } from 'class-validator';

export class ToggleStatusGradeCurricularDto {
  @IsInt()
  @IsIn([0, 1])
  status: number;
}
