import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { Event } from '../../../src/apps/events/models/event.model';
import { EventService } from '../../../src/apps/events/event.service';
import { ParticipantService } from '../../../src/apps/participants/participant.service';

describe('EventService', () => {
  let service: EventService;
  let eventModelMock: any;
  let participantServiceMock: any;

  beforeEach(async () => {
    eventModelMock = {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      destroy: jest.fn(),
    };

    participantServiceMock = {
      findParticipantsByEmails: jest.fn(),
      findParticipantsByIds: jest.fn(),
      findOrCreate: jest.fn(),
      deleteParticipantsByEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        {
          provide: getModelToken(Event),
          useValue: eventModelMock,
        },
        {
          provide: ParticipantService,
          useValue: participantServiceMock,
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
    it('should create an event and return it with participants', async () => {
      const mockEventData = {
        title: 'Test Event',
        startTime: '2025-01-10T10:00:00Z',
        endTime: '2025-01-10T12:00:00Z',
        type: 'team',
        participants: [
          { email: 'john.doe@example.com', name: 'John Doe' },
          { email: 'jane.doe@example.com', name: 'Jane Doe' },
        ],
      };

      const createdEvent = {
        id: '1',
        ...mockEventData,
        participants: [],
      };

      participantServiceMock.findParticipantsByEmails.mockResolvedValue([]);
      participantServiceMock.findOrCreate.mockResolvedValue({ id: 'p1' });
      eventModelMock.create.mockResolvedValue(createdEvent);
      eventModelMock.findByPk.mockResolvedValue({
        ...createdEvent,
        participants: mockEventData.participants,
      });

      const result = await service.createEvent(mockEventData);

      expect(
        participantServiceMock.findParticipantsByEmails,
      ).toHaveBeenCalledWith(['john.doe@example.com', 'jane.doe@example.com']);
      expect(participantServiceMock.findOrCreate).toHaveBeenCalledTimes(
        mockEventData.participants.length,
      );
      expect(eventModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Event',
          startTime: '2025-01-10T10:00:00Z',
          endTime: '2025-01-10T12:00:00Z',
          type: 'team',
        }),
      );
      expect(result.event).toEqual({
        id: '1',
        title: 'Test Event',
        endTime: '2025-01-10T12:00:00Z',
        startTime: '2025-01-10T10:00:00Z',
        type: 'team',
        participants: mockEventData.participants,
      });
    });

    it('should return warnings for scheduling conflicts', async () => {
      const mockEventData = {
        title: 'Test Event',
        startTime: '2025-01-10T10:00:00Z',
        endTime: '2025-01-10T12:00:00Z',
        type: 'team',
        participants: [{ email: 'john.doe@example.com', name: 'John Doe' }],
      };

      const mockCreatedEvent = {
        id: 'event1',
        ...mockEventData,
      };

      const mockConflicts = [
        {
          id: '2',
          title: 'Conflicting Event',
          startTime: '2025-01-10T09:00:00Z',
          endTime: '2025-01-10T11:00:00Z',
        },
      ];
      participantServiceMock.findParticipantsByEmails.mockResolvedValue([
        {
          id: 'p1',
          email: 'john.doe@example.com',
          name: 'John Doe',
          auth0Id: 'auth0|p1',
        },
      ]);

      service.checkConflicts = jest
        .fn()
        .mockResolvedValue({ conflictedEvents: mockConflicts });

      eventModelMock.create.mockResolvedValue(mockCreatedEvent); // Mock du create
      eventModelMock.findByPk.mockResolvedValue({
        ...mockCreatedEvent,
        participants: mockEventData.participants,
      });

      const result = await service.createEvent(mockEventData);

      expect(result.warnings).toEqual({
        message: 'Some participants have scheduling conflicts',
        conflicts: mockConflicts,
      });
    });
  });

  describe('getEventById', () => {
    it('should return the event with participants if found', async () => {
      const mockEvent = {
        id: '1',
        title: 'Sample Event',
        participants: [],
      };

      eventModelMock.findByPk.mockResolvedValue(mockEvent);

      const result = await service.getEventById('1');

      expect(eventModelMock.findByPk).toHaveBeenCalledWith('1', {
        include: expect.any(Object),
      });
      expect(result).toEqual(mockEvent);
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
      participantServiceMock.deleteParticipantsByEvent.mockResolvedValue(
        undefined,
      );

      const result = await service.deleteEvent('1');

      expect(eventModelMock.findByPk).toHaveBeenCalledWith('1');
      expect(
        participantServiceMock.deleteParticipantsByEvent,
      ).toHaveBeenCalledWith('1');
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
          startTime: '2025-01-10T11:00:00Z',
          endTime: '2025-01-10T13:00:00Z',
        },
      ];

      participantServiceMock.findParticipantsByEmails.mockResolvedValue(
        mockParticipants,
      );
      eventModelMock.findAll.mockResolvedValue(mockEvents);

      const result = await service.checkConflicts(mockCheckConflictsDto);

      expect(
        participantServiceMock.findParticipantsByEmails,
      ).toHaveBeenCalledWith(['john.doe@example.com']);
      expect(eventModelMock.findAll).toHaveBeenCalled();
      expect(result.conflictedEvents).toEqual(mockEvents);
    });

    it('should return no conflicts when no overlapping events are found', async () => {
      const mockCheckConflictsDto = {
        startTime: '2025-01-10T14:00:00Z',
        endTime: '2025-01-10T16:00:00Z',
        emails: ['john.doe@example.com'],
      };

      participantServiceMock.findParticipantsByEmails.mockResolvedValue([]);
      eventModelMock.findAll.mockResolvedValue([]);

      const result = await service.checkConflicts(mockCheckConflictsDto);

      expect(result.conflictedEvents).toEqual([]);
    });
  });

  describe('searchEvents', () => {
    it('should return events matching the query', async () => {
      const mockQuery = 'team';
      const mockEvents = [{ id: '1', title: 'Team Meeting' }];

      eventModelMock.findAll.mockResolvedValue(mockEvents);

      const result = await service.searchEvents(mockQuery);

      expect(eventModelMock.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockEvents);
    });
  });
});
