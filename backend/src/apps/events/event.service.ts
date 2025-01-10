import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize } from 'sequelize';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { Event } from './models/event.model';
import * as nodemailer from 'nodemailer';
import { CreateEventInputDto } from './dtos/input/create-event.dto';
import { CheckConflictsInputDto } from './dtos/input/check-conflicts-input.dto';
import { ParticipantService } from '../participants/participant.service';
import { Participant } from '../participants/models/participant.model';
import { EventParticipant } from './models/event-participant.model';
import { UpdateEventInputDto } from './dtos/input/update-event.dto';
import {
  transformEvent,
  transformEvents,
} from '../../common/helpers/event.helper';
import { UpdateParticipantDto } from '../participants/dtos/input/update-participant.dto';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectModel(Event) private eventModel: typeof Event,
    @InjectModel(EventParticipant)
    private eventParticipantModel: typeof EventParticipant,
    private participantService: ParticipantService,
    private configService: ConfigService,
  ) {
    const nodemailerConfig = this.configService.get('nodemailer');
    this.transporter = nodemailer.createTransport({
      service: nodemailerConfig.service,
      host: nodemailerConfig.host,
      port: nodemailerConfig.port,
      secure: nodemailerConfig.secure,
      auth: nodemailerConfig.auth,
    });
  }

  async listEvents(limit = 100) {
    return await this.eventModel.findAll({
      limit,
      include: {
        model: Participant,
        through: { attributes: ['role'] },
      },
    });
  }
  async createEvent(createEventInputDto: CreateEventInputDto): Promise<Event> {
    const { participants: participantInputs, ...eventData } =
      createEventInputDto;

    if (eventData.endTime <= eventData.startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    const participants = await this.participantService.findOrCreateParticipants(
      participantInputs,
    );

    const event = await this.eventModel.create(eventData);

    await Promise.all(
      participants.map((participant) => {
        const participantInput = participantInputs.find(
          (p) => p.email === participant.email,
        );
        return this.eventParticipantModel.create({
          eventId: event.id,
          participantId: participant.id,
          role: participantInput.role || 'viewer',
        });
      }),
    );

    const eventWithParticipants = await this.eventModel.findByPk(event.id, {
      include: {
        model: Participant,
        through: { attributes: ['role'] },
        attributes: ['id', 'name', 'email'],
      },
    });

    if (eventWithParticipants) {
      await Promise.all(
        eventWithParticipants.participants.map(async (participant: any) => {
          const role = participant.EventParticipant.role;
          await this.sendInvitationEmail(
            participant,
            eventWithParticipants,
            role,
          );
        }),
      );
      this.logger.log('Invitation emails sent');
    }

    return transformEvent(eventWithParticipants);
  }

  async getEventById(eventId: string) {
    const event = await this.eventModel.findByPk(eventId, {
      include: {
        model: Participant,
        through: { attributes: ['role'] },
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

    return transformEvent(event);
  }

  async deleteEvent(eventId: string) {
    const event = await this.eventModel.findByPk(eventId);

    if (!event) {
      throw new BadRequestException(`Event with ID ${eventId} not found`);
    }

    await this.eventParticipantModel.destroy({ where: { eventId } });

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
          through: { attributes: ['role'] },
          where: { auth0Id: { [Op.in]: auth0Ids } },
          attributes: ['id', 'name', 'email'],
          required: true,
        },
      ],
    });

    return {
      conflictedEvents: transformEvents(conflicts),
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

  async updateEvent(eventId: string, updateEventInputDto: UpdateEventInputDto) {
    const event = await this.eventModel.findByPk(eventId);

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const { participants: participantInputs = [], ...eventData } =
      updateEventInputDto;

    // Mettre à jour uniquement les champs modifiés
    const updatedEventData = this.getUpdatedFields(event, eventData);
    if (Object.keys(updatedEventData).length > 0) {
      await event.update(updatedEventData);
    }

    if (participantInputs.length > 0) {
      await this.updateParticipants(eventId, participantInputs);
    }

    return {
      isUpdated: Object.keys(updatedEventData).length > 0,
    };
  }

  private getUpdatedFields(event: any, eventData: Partial<typeof event>) {
    const updatedFields: Partial<typeof event> = {};
    for (const key in eventData) {
      if (eventData[key] !== undefined && event[key] !== eventData[key]) {
        updatedFields[key] = eventData[key];
      }
    }
    return updatedFields;
  }

  private async updateParticipants(
    eventId: string,
    participantInputs: UpdateParticipantDto[],
  ) {
    await this.eventParticipantModel.destroy({ where: { eventId } });

    await Promise.all(
      participantInputs.map((participant) =>
        this.participantService.findOrCreate({
          ...participant,
          eventId,
        }),
      ),
    );
  }

  generateInvitationToken(
    eventId: string,
    participantId: string,
    role: string,
  ): string {
    const secret = this.configService.get<string>('app.secret');
    return jwt.sign({ eventId, participantId, role }, secret, {
      expiresIn: '7d',
    });
  }

  verifyInvitationToken(token: string): {
    eventId: string;
    participantId: string;
    role: string;
  } {
    const secret = this.configService.get<string>('app.secret');
    return jwt.verify(token, secret) as {
      eventId: string;
      participantId: string;
      role: string;
    };
  }

  async sendInvitationEmail(
    participant: Participant,
    event: Event,
    role: string,
  ) {
    const token = this.generateInvitationToken(event.id, participant.id, role);
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const link = `${frontendUrl}/events/calendar?token=${token}`;

    const mailOptions = {
      from: this.configService.get<string>('nodemailer.auth.user'),
      to: participant.email,
      subject: `Invitation à l'événement : ${event.title}`,
      html: `
      <html>
        <body>
          <p>Bonjour ${participant.name},</p>
          <p>Vous avez été invité à l'événement:  <strong>${event.title}</strong>.</p>
          <p><strong>Votre rôle :</strong> ${role}</p>
          <p>
            Cliquez sur le lien ci-dessous pour accéder à l'événement :<br />
            <a href="${link}" target="_blank" style="color: blue; text-decoration: underline;">
              Accéder à l'événement
            </a>
          </p>
          <p>Ou copiez et collez ce lien dans votre navigateur :</p>
          <p style="word-break: break-all;">${link}</p>
        </body>
      </html>
    `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${info.messageId}`);
    } catch (error) {
      this.logger.error('Error sending email:', error);
      throw error;
    }
  }
}
