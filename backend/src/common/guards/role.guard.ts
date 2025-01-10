// TODO: Brainstorm about how to it can be implemented in this case during technical interview
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { decode } from 'jsonwebtoken';
import { EventParticipant } from '../../apps/events/models/event-participant.model';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('No authorization header provided');
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = decode(token);
    const userId = decodedToken.sub;

    const eventId = request.params.eventId;
    const participant = await EventParticipant.findOne({
      where: { participantId: userId, eventId },
    });

    if (!participant) {
      throw new UnauthorizedException(
        'You do not have permissions for this event',
      );
    }

    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles || requiredRoles.includes(participant.role)) {
      return true;
    }

    throw new UnauthorizedException('You do not have the required permissions');
  }
}
