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
import { CreateEventOutputDto } from './dtos/output/event';
import { UpdateEventInputDto } from './dtos/input/update-event.dto';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event) private eventModel: typeof Event,
    private participantService: ParticipantService,
  ) {}

  async listEvents(limit = 100) {
    return await this.eventModel.findAll({
      limit,
      include: {
        model: Participant,
        through: { attributes: ['role'] },
      },
    });
  }
  async createEvent(
    createEventInputDto: CreateEventInputDto,
  ): Promise<CreateEventOutputDto> {
    const { participants: participantInputs, ...eventData } =
      createEventInputDto;
    const participants = await this.participantService.findParticipantsByEmails(
      participantInputs.map((p) => p.email),
    );

    const conflicting = await this.checkConflicts(
      {
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        userIds: [],
      },
      participants.map((p) => p.auth0Id),
    );

    const event = await this.eventModel.create(eventData);

    await Promise.all(
      createEventInputDto.participants.map((participant) =>
        this.participantService.findOrCreate({
          ...participant,
          eventId: event.id,
        }),
      ),
    );

    const fetchEvent = await this.eventModel.findByPk(event.id, {
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

    return {
      event: fetchEvent,
      warnings: conflicting.conflictedEvents.length
        ? {
            message: 'Some participants have scheduling conflicts',
            conflicts: conflicting.conflictedEvents,
          }
        : null,
    };
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
    auth0Ids?: string[],
  ): Promise<{ conflictedEvents: Event[] }> {
    const { startTime, endTime, emails } = checkConflictsDto;

    if (!auth0Ids && (!emails || emails.length === 0)) {
      return { conflictedEvents: [] };
    }

    if (!auth0Ids) {
      const participantsList =
        await this.participantService.findParticipantsByEmails(emails);
      auth0Ids = [...new Set(participantsList.map((p) => p.auth0Id))];
    }

    if (auth0Ids.length === 0) {
      return { conflictedEvents: [] };
    }

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
          attributes: { exclude: ['auth0Id'] },
          required: true,
        },
      ],
    });

    return {
      conflictedEvents: conflicts,
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

  async updateEvent(eventId: string, createEventInputDto: UpdateEventInputDto) {
    const event = await this.eventModel.findByPk(eventId);

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const { participants: participantInputs, ...eventData } =
      createEventInputDto;
    const participants = await this.participantService.findParticipantsByEmails(
      participantInputs.map((p) => p.email),
    );

    const conflicting = await this.checkConflicts(
      {
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        userIds: [],
      },
      participants.map((p) => p.auth0Id),
    );

    await event.update(eventData);

    await this.participantService.deleteParticipantsByEvent(eventId);

    await Promise.all(
      createEventInputDto.participants.map((participant) =>
        this.participantService.findOrCreate({
          ...participant,
          eventId: event.id,
        }),
      ),
    );

    const fetchEvent = await this.eventModel.findByPk(event.id, {
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

    return {
      event: fetchEvent,
      warnings: conflicting.conflictedEvents.length
        ? {
            message: 'Some participants have scheduling conflicts',
            conflicts: conflicting.conflictedEvents,
          }
        : null,
    };
  }
}
