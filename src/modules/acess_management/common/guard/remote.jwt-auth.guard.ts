import { HttpService } from "@nestjs/axios";
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class RemoteJwtAuthGuard implements CanActivate {
  constructor(private httpService: HttpService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) throw new UnauthorizedException();

    try {
      const response:any = await this.httpService
        .get('http://127.0.0.1:3003/api/auth/validate-token', {
          headers: { authorization: `Bearer ${token}` },
        })
        .toPromise();

      if (!response.data.valid) throw new Error();

      request.user = response.data;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }
  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return authHeader.split(' ')[1];
  }
}