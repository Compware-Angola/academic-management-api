
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,

} from 'class-validator';

@ValidatorConstraint({ name: 'isAtLeastYearsOld', async: false })
export class IsAtLeastYearsOld implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    if (!value) return true;

    const minYears = args.constraints[0] as number;

    const birthDate = new Date(value);
    if (isNaN(birthDate.getTime())) return false;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();


    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age >= minYears;
  }

  defaultMessage(args: ValidationArguments) {
    return `A data de nascimento indica que o utilizador tem menos de ${args.constraints[0]} anos.`;
  }
}

