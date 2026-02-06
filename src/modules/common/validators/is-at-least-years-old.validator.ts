// src/common/validators/is-at-least-years-old.validator.ts  (ou onde preferires)
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

@ValidatorConstraint({ name: 'isAtLeastYearsOld', async: false })
export class IsAtLeastYearsOld implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    if (!value) return true; // se optional e vazio, ok

    const minYears = args.constraints[0] as number;

    const birthDate = new Date(value);
    if (isNaN(birthDate.getTime())) return false; // data inválida

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();

    // Ajusta se o aniversário ainda não passou este ano
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

