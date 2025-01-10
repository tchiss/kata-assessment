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

      const createdUser = await this.authService.createUser({
        email: participant.email,
        name: participant.name,
      });

      return await this.participantModel.create({
        email: createdUser.email,
        name: createdUser.name,
        auth0Id: createdUser.user_id,
      });
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

  async findOrCreateParticipants(participants: CreateParticipantInputDto[]) {
    try {
      return await Promise.all(
        participants.map(async (participant) => {
          return await this.findOrCreate(participant);
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to find or create participants: ${JSON.stringify(error)}`,
      );
      throw new Error('Could not find or create participants');
    }
  }
}
