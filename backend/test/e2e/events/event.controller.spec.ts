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
              return { ...participant, auth0Id: `auth0-${participant.email}` };
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
    it('should create a new event', async () => {
      const createEventDto = {
        title: 'Test Event',
        startTime: '2025-01-10T10:00:00Z',
        endTime: '2025-01-10T12:00:00Z',
        type: 'team',
        participants: [
          { name: 'John Doe', email: 'john.doe@example.com' },
          { name: 'Jane Doe', email: 'jane.doe@example.com' },
        ],
      };

      await request(app.getHttpServer())
        .post('/events')
        .send(createEventDto)
        .expect(HttpStatus.CREATED);
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
        .get(`/events/${createdEvent.id}`)
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
        .delete(`/events/${createdEvent.id}`)
        .expect(HttpStatus.NO_CONTENT);
    });
  });

  describe('POST /events/check-conflicts', () => {
    it('should return conflicting users if there are scheduling conflicts', async () => {
      // Créez un événement existant avec un participant
      const existingEvent = {
        title: 'Existing Event',
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T12:00:00Z',
        type: 'team',
        participants: [{ name: 'John Doe', email: 'john.doe@example.com' }],
      };

      await request(app.getHttpServer())
        .post('/events')
        .send(existingEvent)
        .expect(HttpStatus.CREATED);

      // Vérifiez les conflits pour un autre événement avec des horaires qui se chevauchent
      const checkConflictsDto = {
        startTime: '2025-01-15T11:00:00Z',
        endTime: '2025-01-15T13:00:00Z',
        userIds: ['auth0-john.doe@example.com'], // ID généré pour le participant
      };

      const response = await request(app.getHttpServer())
        .post('/events/check-conflicts')
        .send(checkConflictsDto)
        .expect(HttpStatus.OK);

      // Vérifiez que le participant en conflit est renvoyé
      expect(response.body).toEqual({
        conflictingUsers: ['auth0-john.doe@example.com'],
      });
    });

    it('should return an empty array if there are no conflicts', async () => {
      // Créez un événement existant
      const existingEvent = {
        title: 'Existing Event',
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T12:00:00Z',
        type: 'team',
        participants: [{ name: 'John Doe', email: 'john.doe@example.com' }],
      };

      await request(app.getHttpServer())
        .post('/events')
        .send(existingEvent)
        .expect(HttpStatus.CREATED);

      // Vérifiez les conflits pour un autre événement sans chevauchement
      const checkConflictsDto = {
        startTime: '2025-01-15T12:30:00Z',
        endTime: '2025-01-15T14:00:00Z',
        userIds: ['auth0-john.doe@example.com'],
      };

      const response = await request(app.getHttpServer())
        .post('/events/check-conflicts')
        .send(checkConflictsDto)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        conflictingUsers: [],
      });
    });

    it('should throw an error if startTime is after endTime', async () => {
      const checkConflictsDto = {
        startTime: '2025-01-15T13:00:00Z',
        endTime: '2025-01-15T12:00:00Z',
        userIds: ['auth0-john.doe@example.com'],
      };

      const response = await request(app.getHttpServer())
        .post('/events/check-conflicts')
        .send(checkConflictsDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Start time must be before end time');
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
