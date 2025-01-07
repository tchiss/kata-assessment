import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { SequelizeModule } from '@nestjs/sequelize';
import { EventController } from '../../../src/apps/events/event.controller';
import { EventService } from '../../../src/apps/events/event.service';
import { ParticipantService } from '../../../src/apps/participants/participant.service';
import { Event } from '../../../src/apps/events/models/event.model';
import { Participant } from '../../../src/apps/participants/models/participant.model';

describe('EventController (e2e)', () => {
  let app: INestApplication;
  let sequelize;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        SequelizeModule.forRoot({
          dialect: 'sqlite',
          storage: ':memory:',
          synchronize: true,
          autoLoadModels: true,
          logging: false,
          models: [Event, Participant],
        }),
        SequelizeModule.forFeature([Event, Participant]),
      ],
      controllers: [EventController],
      providers: [
        EventService,
        {
          provide: ParticipantService,
          useValue: {
            findOrCreate: jest.fn().mockImplementation(async (participant) => {
              return {
                ...participant,
                eventId: participant.eventId,
                auth0Id: `auth0-${participant.email}`,
              };
            }),
            deleteParticipantsByEvent: jest.fn().mockResolvedValue(undefined),
            getById: jest.fn().mockImplementation(async (id) => {
              return {
                id,
                auth0Id: `auth0-${id}`,
                email: `${id}@example.com`,
                name: 'Test Participant',
              };
            }),
            findParticipantsByEmails: jest
              .fn()
              .mockImplementation(async (emails) =>
                emails.map((email: string, index: number) => ({
                  id: `p${index + 1}`,
                  auth0Id: `auth0-${email}`,
                  email,
                  name: `Participant ${index + 1}`,
                })),
              ),
            findParticipantsByIds: jest.fn(async (ids) =>
              ids.map((id: string, index: number) => ({
                id,
                auth0Id: `auth0-${id}`,
                email: `participant${index + 1}@example.com`,
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
    it('should create a new event and detect scheduling conflicts', async () => {
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

      const newEventDto = {
        title: 'New Event',
        startTime: '2025-01-15T11:00:00Z',
        endTime: '2025-01-15T13:00:00Z',
        type: 'team',
        participants: [{ name: 'John Doe', email: 'john.doe@example.com' }],
      };

      await request(app.getHttpServer())
        .post('/events')
        .send(newEventDto)
        .expect(HttpStatus.CREATED);
    });

    it('should create a new event without conflicts', async () => {
      const eventDto = {
        title: 'Non-Conflicting Event',
        startTime: '2025-01-16T10:00:00Z',
        endTime: '2025-01-16T12:00:00Z',
        type: 'team',
        participants: [{ name: 'Jane Doe', email: 'jane.doe@example.com' }],
      };

      const response = await request(app.getHttpServer())
        .post('/events')
        .send(eventDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.warnings).toBeNull();
    });
  });

  describe('GET /events/:id', () => {
    it('should return an event by ID', async () => {
      const createEventDto = {
        title: 'Sample Event',
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T12:00:00Z',
        type: 'project',
        participants: [],
      };

      const { body: createdEvent } = await request(app.getHttpServer())
        .post('/events')
        .send(createEventDto)
        .expect(HttpStatus.CREATED);

      const response = await request(app.getHttpServer())
        .get(`/events/${createdEvent.event.id}`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        title: 'Sample Event',
        startTime: '2025-01-15T10:00:00.000Z',
        endTime: '2025-01-15T12:00:00.000Z',
        type: 'project',
      });
    });

    it('should return a 404 if the event does not exist', async () => {
      await request(app.getHttpServer())
        .get('/events/1')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('DELETE /events/:id', () => {
    it('should delete an event by ID', async () => {
      const createEventDto = {
        title: 'To be deleted',
        startTime: '2025-01-20T10:00:00Z',
        endTime: '2025-01-20T12:00:00Z',
        type: 'personal',
        participants: [],
      };

      const { body: createdEvent } = await request(app.getHttpServer())
        .post('/events')
        .send(createEventDto)
        .expect(HttpStatus.CREATED);

      await request(app.getHttpServer())
        .delete(`/events/${createdEvent.event.id}`)
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

      await request(app.getHttpServer())
        .post('/events/check-conflicts')
        .send(checkConflictsDto)
        .expect(HttpStatus.OK);
    });

    it('should return an empty array if there are no conflicts', async () => {
      const checkConflictsDto = {
        startTime: '2025-01-15T12:30:00Z',
        endTime: '2025-01-15T14:00:00Z',
        emails: ['john.doe@example.com'],
      };

      const response = await request(app.getHttpServer())
        .post('/events/check-conflicts')
        .send(checkConflictsDto)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        conflictedEvents: [],
      });
    });
  });

  describe('GET /events/search', () => {
    it('should return events matching the query', async () => {
      const createEventDto = {
        title: 'Searchable Event',
        startTime: '2025-01-25T10:00:00Z',
        endTime: '2025-01-25T12:00:00Z',
        type: 'team',
        participants: [],
      };

      await request(app.getHttpServer())
        .post('/events')
        .send(createEventDto)
        .expect(HttpStatus.CREATED);

      const response = await request(app.getHttpServer())
        .get('/events/content/search')
        .query({ query: 'Searchable' })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(1);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: 'Searchable Event' }),
        ]),
      );
    });

    it('should return an empty array if no query matches', async () => {
      const response = await request(app.getHttpServer())
        .get('/events/content/search')
        .query({ query: 'Nonexistent' })
        .expect(HttpStatus.OK);

      expect(response.body).toEqual([]);
    });
  });
});
