import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsEndDateAfterStartDate', async: false })
export class IsEndDateAfterStartDate
  implements ValidatorConstraintInterface
{
  validate(data_fim: string, args: ValidationArguments) {
    const obj: any = args.object;
    if (!obj.data_inicio || !data_fim) return true;

    return new Date(data_fim) >= new Date(obj.data_inicio);
  }

  defaultMessage() {
    return 'A data fim não pode ser menor que a data início';
  }
}
