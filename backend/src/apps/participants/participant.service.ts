import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Participant } from './models/participant.model';
import { CreateParticipantInputDto } from './dtos/input/create-participant.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class ParticipantService {
  private logger = new Logger('ParticipantService');
  constructor(
    @InjectModel(Participant) private participantModel: typeof Participant,
    private authService: AuthService,
  ) {}

  async findOrCreate(participant: CreateParticipantInputDto) {
    try {
      const existingParticipant = await this.participantModel.findOne({
        where: { email: participant.email },
        attributes: { exclude: ['auth0Id'] },
      });

      if (existingParticipant) {
        return existingParticipant;
      }

      if (!participant.eventId) {
        throw new Error('Event ID is required to create a participant');
      }

      const createdUser = await this.authService.createUser({
        email: participant.email,
        name: participant.name,
      });

      const newParticipant = await this.participantModel.create({
        email: createdUser.email,
        name: createdUser.name,
        auth0Id: createdUser.user_id,
        eventId: participant.eventId,
        role: participant.role || 'viewer',
      });

      const { id, email, name } = newParticipant.toJSON();

      return { id, email, name };
    } catch (error) {
      this.logger.error(
        `Failed to find or create participant: ${JSON.stringify(error)}`,
      );
      throw new Error('Could not find or create participant');
    }
  }

  async findParticipantsByEmails(emails: string[]) {
    try {
      return await this.participantModel.findAll({
        where: { email: { [Op.in]: emails } },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find participants by emails: ${JSON.stringify(error)}`,
      );
      throw new Error('Could not find participants by emails');
    }
  }

  async deleteParticipantsByEvent(eventId: string) {
    try {
      await this.participantModel.destroy({ where: { eventId } });
    } catch (error) {
      this.logger.error(
        `Failed to delete participants by event: ${JSON.stringify(error)}`,
      );
      throw new Error('Could not delete participants by event');
    }
  }

  async findParticipantsByIds(ids: string[]) {
    try {
      return await this.participantModel.findAll({
        where: { id: { [Op.in]: ids } },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find participants by IDs: ${JSON.stringify(error)}`,
      );
      throw new Error('Could not find participants by IDs');
    }
  }
}
