import {
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

export function IsNotPastDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNotPastDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!value) return true;

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const inputDate = new Date(value);
          inputDate.setHours(0, 0, 0, 0);

          return inputDate >= today;
        },
      },
    });
  };
}
