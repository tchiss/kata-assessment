import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { SequelizeModule } from '@nestjs/sequelize';
import { EventController } from '../../../src/apps/events/event.controller';
import { EventService } from '../../../src/apps/events/event.service';
import { ParticipantService } from '../../../src/apps/participants/participant.service';
import { Event } from '../../../src/apps/events/models/event.model';
import { Participant } from '../../../src/apps/participants/models/participant.model';
import { EventParticipant } from '../../../src/apps/events/models/event-participant.model';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { config } from '../../test-helper';

describe('EventController (e2e)', () => {
  let app: INestApplication;
  let sequelize;
  let transporterMock;

  beforeAll(async () => {
    transporterMock = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'mockMessageId' }),
    };
    jest.spyOn(nodemailer, 'createTransport').mockReturnValue(transporterMock);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        SequelizeModule.forRoot({
          dialect: 'sqlite',
          storage: ':memory:',
          synchronize: true,
          autoLoadModels: true,
          logging: false,
          models: [Event, Participant, EventParticipant],
          dialectOptions: {
            foreignKeys: true,
          },
        }),
        SequelizeModule.forFeature([Event, Participant, EventParticipant]),
      ],
      controllers: [EventController],
      providers: [
        EventService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              return config[key];
            }),
          },
        },
        {
          provide: ParticipantService,
          useValue: {
            findOrCreateParticipants: jest.fn(async (participants) =>
              participants.map((participant, index) => ({
                id: `p${index + 1}`,
                email: participant.email,
                name: participant.name,
              })),
            ),
            findParticipantsByEmails: jest.fn(async (emails) =>
              emails.map((email, index) => ({
                id: `p${index + 1}`,
                email,
                name: `Participant ${index + 1}`,
              })),
            ),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    try {
      sequelize = moduleFixture.get('Sequelize');
      await sequelize.query('PRAGMA foreign_keys = ON;');
      await sequelize.sync({ force: true });
    } catch (error) {}
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    if (sequelize) {
      await sequelize.truncate({ cascade: true });
    }
  });

  describe('POST /events', () => {
    it('should create a new event and send invitations', async () => {
      const eventDto = {
        title: 'New Event',
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T12:00:00Z',
        type: 'team',
        participants: [{ name: 'John Doe', email: 'john.doe@example.com' }],
      };

      const response = await request(app.getHttpServer())
        .post('/events')
        .send(eventDto)
        .expect(HttpStatus.CREATED);

      expect(transporterMock.sendMail).toHaveBeenCalled();
      expect(response.body).toMatchObject({
        title: 'New Event',
        participants: [{ email: 'john.doe@example.com', name: 'John Doe' }],
      });
    });
  });

  describe('GET /events/:id', () => {
    it('should return an event by ID', async () => {
      const eventDto = {
        title: 'Sample Event',
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T12:00:00Z',
        type: 'team',
        participants: [],
      };

      const { body: createdEvent } = await request(app.getHttpServer())
        .post('/events')
        .send(eventDto)
        .expect(HttpStatus.CREATED);

      const response = await request(app.getHttpServer())
        .get(`/events/${createdEvent.id}`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        title: 'Sample Event',
        startTime: '2025-01-15T10:00:00.000Z',
        endTime: '2025-01-15T12:00:00.000Z',
      });
    });
  });

  describe('PUT /events/:id', () => {
    it('should update an event and return the updated details', async () => {
      const eventDto = {
        title: 'Original Event',
        startTime: '2025-01-18T10:00:00Z',
        endTime: '2025-01-18T12:00:00Z',
        type: 'workshop',
        participants: [{ name: 'Jane Doe', email: 'jane.doe@example.com' }],
      };

      const { body: createdEvent } = await request(app.getHttpServer())
        .post('/events')
        .send(eventDto)
        .expect(HttpStatus.CREATED);

      const updateDto = {
        title: 'Updated Event',
        startTime: '2025-01-18T14:00:00Z',
        endTime: '2025-01-18T16:00:00Z',
      };

      const response = await request(app.getHttpServer())
        .put(`/events/${createdEvent.id}`)
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        title: 'Updated Event',
        startTime: '2025-01-18T14:00:00.000Z',
        endTime: '2025-01-18T16:00:00.000Z',
      });
    });
  });

  describe('DELETE /events/:id', () => {
    it('should delete an event by ID', async () => {
      const eventDto = {
        title: 'To be deleted',
        startTime: '2025-01-20T10:00:00Z',
        endTime: '2025-01-20T12:00:00Z',
        type: 'personal',
        participants: [],
      };

      const { body: createdEvent } = await request(app.getHttpServer())
        .post('/events')
        .send(eventDto)
        .expect(HttpStatus.CREATED);

      await request(app.getHttpServer())
        .delete(`/events/${createdEvent.id}`)
        .expect(HttpStatus.NO_CONTENT);
    });
  });

  describe('POST /events/check-conflicts', () => {
    it('should return conflicting events if there are scheduling conflicts', async () => {
      const existingEventDto = {
        title: 'Existing Event',
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T12:00:00Z',
        type: 'team',
        participants: [{ name: 'John Doe', email: 'john.doe@example.com' }],
      };

      await request(app.getHttpServer())
        .post('/events')
        .send(existingEventDto)
        .expect(HttpStatus.CREATED);

      const checkConflictsDto = {
        startTime: '2025-01-15T11:00:00Z',
        endTime: '2025-01-15T13:00:00Z',
        emails: ['john.doe@example.com'],
      };

      const response = await request(app.getHttpServer())
        .post('/events/check-conflicts')
        .send(checkConflictsDto)
        .expect(HttpStatus.OK);

      expect(response.body.conflictedEvents).toHaveLength(1);
    });
  });
});
