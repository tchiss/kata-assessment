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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        SequelizeModule.forRoot({
          dialect: 'sqlite',
          storage: ':memory:',
          synchronize: true,
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
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const modules = moduleFixture['container'].getModules();
    for (const [moduleName, moduleRef] of modules) {
      console.log(`Module: ${moduleName}`);
      const providers = moduleRef.providers;
      for (const [providerName] of providers) {
        console.log(`  Provider: ${providerName as any}`);
      }
    }
    try {
      const sequelize = moduleFixture.get('Sequelize');
      console.log('Sequelize instance found:', sequelize);
    } catch (error) {}
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    const sequelize = app.get('Sequelize');
    await sequelize.truncate({ cascade: true });
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

      const response = await request(app.getHttpServer())
        .post('/events')
        .send(createEventDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        title: 'Test Event',
        startTime: '2025-01-10T10:00:00.000Z',
        endTime: '2025-01-10T12:00:00.000Z',
        type: 'team',
        participants: [
          { name: 'John Doe', email: 'john.doe@example.com' },
          { name: 'Jane Doe', email: 'jane.doe@example.com' },
        ],
      });
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

    it('should return 404 if event is not found', async () => {
      await request(app.getHttpServer())
        .get('/events/invalid-id')
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

      await request(app.getHttpServer())
        .get(`/events/${createdEvent.id}`)
        .expect(HttpStatus.NOT_FOUND);
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
        .get('/events/search')
        .query({ query: 'Searchable' })
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: 'Searchable Event' }),
        ]),
      );
    });

    it('should return an empty array if no query matches', async () => {
      const response = await request(app.getHttpServer())
        .get('/events/search')
        .query({ query: 'Nonexistent' })
        .expect(HttpStatus.OK);

      expect(response.body).toEqual([]);
    });
  });
});
