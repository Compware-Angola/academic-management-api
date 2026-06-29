
import {
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
} from 'class-validator';

export interface DocValidationRule {
    regex: RegExp;
    message: string;
}

export const DOC_VALIDATION_RULES: Record<number, DocValidationRule> = {
    1: {
        // Bilhete de Identidade
        regex: /^\d{9}[A-Z]{2}\d{3}$/,
        message:
            'O Bilhete de Identidade deve seguir o formato angolano: 9 dígitos + 2 letras maiúsculas + 3 dígitos (ex: 001234567LA047)',
    },
    2: {
        // Passaporte
        regex: /^[A-Z]{1,2}\d{6,7}$/,
        message:
            'O Passaporte deve conter 1-2 letras maiúsculas seguidas de 6-7 dígitos (ex: N1234567)',
    },
    3: {
        // Cédula
        regex: /^\d{6,10}$/,
        message: 'A Cédula deve conter entre 6 e 10 dígitos numéricos',
    },
    4: {
        // Carta de Condução
        regex: /^[A-Z0-9]{6,12}$/,
        message:
            'A Carta de Condução deve conter entre 6 e 12 caracteres alfanuméricos maiúsculos',
    },
    5: {
        // Comprovativo de Matrícula
        regex: /^[A-Z0-9\-\/]{5,20}$/,
        message:
            'O Comprovativo de Matrícula deve conter entre 5 e 20 caracteres alfanuméricos',
    },
    6: {
        // Certidão
        regex: /^[A-Z0-9\-\/]{5,20}$/,
        message: 'A Certidão deve conter entre 5 e 20 caracteres alfanuméricos',
    },
    7: {
        // Certificado Com Notas
        regex: /^[A-Z0-9\-\/]{5,20}$/,
        message:
            'O Certificado Com Notas deve conter entre 5 e 20 caracteres alfanuméricos',
    },
    8: {
        // Declaração de Fim de Curso
        regex: /^[A-Z0-9\-\/]{5,20}$/,
        message:
            'A Declaração de Fim de Curso deve conter entre 5 e 20 caracteres alfanuméricos',
    },
};

@ValidatorConstraint({ name: 'IsValidDocNumber', async: false })
export class IsValidDocNumber implements ValidatorConstraintInterface {
    private errorMessage: string = 'Número de documento inválido';

    validate(numDocIdentificacao: string, args: ValidationArguments): boolean {
        const obj = args.object as { tipoDocumentoId?: number };
        const tipoDocumentoId = obj.tipoDocumentoId;

        if (!tipoDocumentoId) {
            this.errorMessage = 'O tipo de documento (tipoDocumentoId) é obrigatório para validar o número do documento';
            return false;
        }

        const rule = DOC_VALIDATION_RULES[tipoDocumentoId];

        if (!rule) {
            this.errorMessage = `Tipo de documento com código ${tipoDocumentoId} não reconhecido`;
            return false;
        }

        const isValid = rule.regex.test(numDocIdentificacao);
        if (!isValid) {
            this.errorMessage = rule.message;
        }

        return isValid;
    }

    defaultMessage(): string {
        return this.errorMessage;
    }
}