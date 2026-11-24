import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { Request } from 'express';

export interface AuthenticatedUser {
  sub: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  permissions: string[];
}

export interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.slice(7);
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new UnauthorizedException('JWT configuration error');
    }

    try {
      const payload = jwt.verify(token, secret) as AuthenticatedUser;
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
