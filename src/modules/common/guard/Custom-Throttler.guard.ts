import {
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
  ): Promise<void> {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Estás a fazer muitas requisições. Tenta novamente mais tarde.',
        error: 'Too Many Requests',
        customCode: 'RATE_LIMIT_EXCEEDED',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}