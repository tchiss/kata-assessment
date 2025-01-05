import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Event } from './models/event.model';
import { CreateEventInputDto } from './dtos/input/create-event.dto';
import { CheckConflictsInputDto } from './dtos/input/check-conflicts-input.dto';
import { ParticipantService } from '../participants/participant.service';

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
      include: { all: true },
    });
  }

  async getEventById(eventId: string) {
    const event = await this.eventModel.findByPk(eventId, {
      include: { all: true },
    });

    if (!event) {
      throw new BadRequestException(`Event with ID ${eventId} not found`);
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

    const conflicts = await this.eventModel.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: userIds.map((userId) => ({
              participants: { [Op.contains]: [userId] },
            })),
          },
          {
            [Op.or]: [
              {
                startTime: { [Op.lte]: endTime },
                endTime: { [Op.gte]: startTime },
              },
            ],
          },
        ],
      },
      include: { all: true },
    });

    const conflictingUsers = conflicts
      .flatMap((event) => event.participants)
      .filter((participant) => userIds.includes(participant.id));

    return {
      conflictingUsers: Array.from(
        new Set(conflictingUsers.map((user) => user.id)),
      ),
    };
  }

  async searchEvents(query: string) {
    return await this.eventModel.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.iLike]: `%${query}%` } },
          { type: { [Op.iLike]: `%${query}%` } },
        ],
      },
      include: [
        {
          association: 'participants',
          where: {
            [Op.or]: [
              { name: { [Op.iLike]: `%${query}%` } },
              { email: { [Op.iLike]: `%${query}%` } },
            ],
          },
          required: false,
        },
      ],
    });
  }
}
