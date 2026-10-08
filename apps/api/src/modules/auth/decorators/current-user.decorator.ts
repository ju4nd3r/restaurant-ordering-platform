import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserProfileDto } from '../dto/auth-response.dto';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserProfileDto => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
