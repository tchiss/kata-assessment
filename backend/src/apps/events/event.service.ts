import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize } from 'sequelize';
import { Event } from './models/event.model';
import { CreateEventInputDto } from './dtos/input/create-event.dto';
import { CheckConflictsInputDto } from './dtos/input/check-conflicts-input.dto';
import { ParticipantService } from '../participants/participant.service';
import { Participant } from '../participants/models/participant.model';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event) private eventModel: typeof Event,
    private participantService: ParticipantService,
  ) {}

  async createEvent(createEventInputDto: CreateEventInputDto) {
    const { ...eventData } = createEventInputDto;

    if (eventData.startTime >= eventData.endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    const event = await this.eventModel.create(eventData);

    await Promise.all(
      createEventInputDto.participants.map((participant) =>
        this.participantService.findOrCreate({
          ...participant,
          eventId: event.id,
        }),
      ),
    );

    return await this.eventModel.findByPk(event.id, {
      include: {
        model: Participant,
        attributes: [
          'id',
          'name',
          'email',
          'eventId',
          'role',
          'createdAt',
          'updatedAt',
        ],
      },
    });
  }

  async getEventById(eventId: string) {
    const event = await this.eventModel.findByPk(eventId, {
      include: {
        model: Participant,
        attributes: [
          'id',
          'name',
          'email',
          'eventId',
          'role',
          'createdAt',
          'updatedAt',
        ],
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    return event;
  }

  async deleteEvent(eventId: string) {
    const event = await this.eventModel.findByPk(eventId);

    if (!event) {
      throw new BadRequestException(`Event with ID ${eventId} not found`);
    }

    await this.participantService.deleteParticipantsByEvent(eventId);

    await event.destroy();
    return { message: `Event with ID ${eventId} has been deleted` };
  }

  async checkConflicts(
    checkConflictsDto: CheckConflictsInputDto,
  ): Promise<{ conflictingUsers: string[] }> {
    const { startTime, endTime, userIds } = checkConflictsDto;

    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    const participants = await Promise.all(
      userIds.map((userId) => this.participantService.getById(userId)),
    );

    const auth0Ids = participants.map((p) => p.auth0Id);


    const all = await this.eventModel.findAll({
      where: {
        [Op.and]: [
          { startTime: { [Op.lte]: endTime } },
          { endTime: { [Op.gte]: startTime } },
        ],
      },
      include: [
        {
          association: 'participants',
          where: { auth0Id: { [Op.in]: auth0Ids } },
          required: true,
        },
      ],
    });
    const conflicts = await this.eventModel.findAll({
      where: {
        [Op.and]: [
          { startTime: { [Op.lte]: endTime } },
          { endTime: { [Op.gte]: startTime } },
        ],
      },
      include: [
        {
          association: 'participants',
          where: { auth0Id: { [Op.in]: auth0Ids } },
          required: true,
        },
      ],
    });

    const conflictingUsers = conflicts.flatMap((event) =>
      event.participants.map((participant) => participant.auth0Id),
    );

    return {
      conflictingUsers: Array.from(new Set(conflictingUsers)),
    };
  }

  async searchEvents(query: string) {
    return await this.eventModel.findAll({
      include: [
        {
          association: 'participants',
          attributes: [
            'id',
            'name',
            'email',
            'eventId',
            'role',
            'createdAt',
            'updatedAt',
          ],
          required: false,
        },
      ],
      where: {
        [Op.or]: [
          Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('Event.title')), {
            [Op.like]: `%${query.toLowerCase()}%`,
          }),
          Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('Event.type')), {
            [Op.like]: `%${query.toLowerCase()}%`,
          }),
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('participants.name')),
            { [Op.like]: `%${query.toLowerCase()}%` },
          ),
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('participants.email')),
            { [Op.like]: `%${query.toLowerCase()}%` },
          ),
        ],
      },
    });
  }
}
