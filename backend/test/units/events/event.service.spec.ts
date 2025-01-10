import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { Event } from '../../../src/apps/events/models/event.model';
import { EventService } from '../../../src/apps/events/event.service';
import { ParticipantService } from '../../../src/apps/participants/participant.service';
import { EventParticipant } from '../../../src/apps/events/models/event-participant.model';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EVENT_TYPE } from '../../../src/common/types/event.type';

const config = {
  nodemailer: {
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'test@example.com',
      pass: 'password',
    },
  },
  'nodemailer.auth.user': 'test@example.com',
  'app.secret': 'secret',
  'app.frontendUrl': 'http://localhost:3000',
  app: {
    port: 3000,
    secret: 'secret',
  },
};

describe('EventService', () => {
  let service: EventService;
  let eventModelMock: any;
  let eventParticipantModelMock: any;
  let participantServiceMock: any;
  let configServiceMock: any;
  let transporterMock: any;

  beforeEach(async () => {
    eventModelMock = {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      destroy: jest.fn(),
      update: jest.fn(),
    };

    eventParticipantModelMock = {
      create: jest.fn(),
      destroy: jest.fn(),
    };

    participantServiceMock = {
      findParticipantsByEmails: jest.fn(),
      findOrCreateParticipants: jest.fn(),
    };

    configServiceMock = {
      get: jest.fn().mockImplementation((key: string) => {
        return config[key];
      }),
    };

    transporterMock = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'mockMessageId' }),
    };
    jest.spyOn(nodemailer, 'createTransport').mockReturnValue(transporterMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        {
          provide: getModelToken(Event),
          useValue: eventModelMock,
        },
        {
          provide: getModelToken(EventParticipant),
          useValue: eventParticipantModelMock,
        },
        {
          provide: ParticipantService,
          useValue: participantServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createEvent', () => {
    it('should create an event and send invitations', async () => {
      const mockEventData = {
        title: 'Test Event',
        startTime: '2025-01-10T10:00:00Z',
        endTime: '2025-01-10T12:00:00Z',
        type: EVENT_TYPE.TEAM,
        participants: [
          { email: 'john.doe@example.com', name: 'John Doe', role: 'editor' },
        ],
      };

      const mockParticipant = {
        id: 'p1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        EventParticipant: { role: 'editor' },
        toJSON: () => ({
          id: 'p1',
          name: 'John Doe',
          email: 'john.doe@example.com',
          EventParticipant: { role: 'editor' },
        }),
      };
      const mockEvent = {
        id: '1',
        title: 'Test Event',
        startTime: '2025-01-10T10:00:00Z',
        endTime: '2025-01-10T12:00:00Z',
        toJSON: () => ({
          id: '1',
          title: 'Test Event',
          startTime: '2025-01-10T10:00:00Z',
          endTime: '2025-01-10T12:00:00Z',
        }),
        participants: [mockParticipant],
      };
      const createdEvent = {
        id: '1',
        title: 'Test Event',
        startTime: '2025-01-10T10:00:00Z',
        endTime: '2025-01-10T12:00:00Z',
        participants: [
          {
            toJSON: () => ({
              id: 'p1',
              name: 'John Doe',
              email: 'john.doe@example.com',
              EventParticipant: { role: 'editor' },
            }),
          },
        ],
        toJSON: () => ({
          id: '1',
          title: 'Test Event',
          startTime: '2025-01-10T10:00:00Z',
          endTime: '2025-01-10T12:00:00Z',
        }),
      };

      participantServiceMock.findOrCreateParticipants.mockResolvedValue([
        { id: 'p1', email: 'john.doe@example.com', name: 'John Doe' },
      ]);
      eventModelMock.create.mockResolvedValue(mockEvent);
      eventModelMock.findByPk.mockResolvedValue(mockEvent);

      const result = await service.createEvent(mockEventData);

      expect(eventModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Event',
          startTime: '2025-01-10T10:00:00Z',
          endTime: '2025-01-10T12:00:00Z',
        }),
      );
      expect(transporterMock.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john.doe@example.com',
          subject: "Invitation à l'événement : Test Event",
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: '1',
          title: 'Test Event',
          participants: expect.any(Array),
        }),
      );
    });

    it('should throw BadRequestException for invalid time range', async () => {
      const mockEventData = {
        title: 'Invalid Event',
        startTime: '2025-01-10T12:00:00Z',
        endTime: '2025-01-10T10:00:00Z',
        type: EVENT_TYPE.TEAM,
        participants: [],
      };

      await expect(service.createEvent(mockEventData)).rejects.toThrowError(
        'End time must be after start time',
      );
    });
  });

  describe('getEventById', () => {
    it('should return an event with participants', async () => {
      const mockEvent = {
        id: '1',
        title: 'Sample Event',
        participants: [
          {
            id: 'p1',
            name: 'John Doe',
            email: 'john.doe@example.com',
            EventParticipant: { role: 'editor' },
            toJSON: () => ({
              id: 'p1',
              name: 'John Doe',
              email: 'john.doe@example.com',
              EventParticipant: { role: 'editor' },
            }),
          },
        ],
        toJSON: () => ({
          id: '1',
          title: 'Sample Event',
        }),
      };

      eventModelMock.findByPk.mockResolvedValue(mockEvent);

      const result = await service.getEventById('1');

      expect(eventModelMock.findByPk).toHaveBeenCalledWith('1', {
        include: expect.any(Object),
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: '1',
          title: 'Sample Event',
        }),
      );
    });

    it('should throw NotFoundException if event is not found', async () => {
      eventModelMock.findByPk.mockResolvedValue(null);

      await expect(service.getEventById('1')).rejects.toThrowError(
        'Event with ID 1 not found',
      );
    });
  });

  describe('deleteEvent', () => {
    it('should delete the event and its participants', async () => {
      const mockEvent = {
        id: '1',
        destroy: jest.fn().mockResolvedValue(undefined),
      };

      eventModelMock.findByPk.mockResolvedValue(mockEvent);

      const result = await service.deleteEvent('1');

      expect(eventModelMock.findByPk).toHaveBeenCalledWith('1');
      expect(eventParticipantModelMock.destroy).toHaveBeenCalledWith({
        where: { eventId: '1' },
      });
      expect(mockEvent.destroy).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Event with ID 1 has been deleted' });
    });
  });

  describe('checkConflicts', () => {
    it('should return conflicting events', async () => {
      const mockCheckConflictsDto = {
        startTime: '2025-01-10T10:00:00Z',
        endTime: '2025-01-10T12:00:00Z',
        emails: ['john.doe@example.com'],
      };

      const mockParticipants = [
        { id: 'p1', auth0Id: 'auth0|p1', email: 'john.doe@example.com' },
      ];

      const mockEvents = [
        {
          id: '2',
          title: 'Conflicting Event',
          startTime: '2025-01-10T11:00:00Z',
          endTime: '2025-01-10T13:00:00Z',
          participants: [],
          toJSON: () => ({
            id: '2',
            title: 'Conflicting Event',
            startTime: '2025-01-10T11:00:00Z',
            endTime: '2025-01-10T13:00:00Z',
            participants: [],
          }),
        },
      ];

      participantServiceMock.findParticipantsByEmails.mockResolvedValue(
        mockParticipants,
      );
      eventModelMock.findAll.mockResolvedValue(mockEvents);

      const result = await service.checkConflicts(mockCheckConflictsDto);

      expect(result.conflictedEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: '2',
            title: 'Conflicting Event',
          }),
        ]),
      );
    });
  });
});
