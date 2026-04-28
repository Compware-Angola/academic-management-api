import { CreatePreRegistrationDto } from "./dto/create-pre-inscricao.dto";

export class PreRegistrationService {
    constructor(

    ) { }
    async create(createPreRegistrationDto: CreatePreRegistrationDto) {
        console.log(createPreRegistrationDto)
        return createPreRegistrationDto;
    }
}   