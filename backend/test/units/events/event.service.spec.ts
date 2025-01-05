import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { Event } from '../../../src/apps/events/models/event.model';
import { EventService } from '../../../src/apps/events/event.service';
import { ParticipantService } from '../../../src/apps/participants/participant.service';
import { Op } from 'sequelize';
import { mockEvents, mockEventsWithParticipant } from './mock.data';

describe('EventService', () => {
  let service: EventService;
  let eventModelMock: any;
  let participantServiceMock: any;

  beforeEach(async () => {
    eventModelMock = {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
    };

    participantServiceMock = {
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
    it('should create an event successfully with participants', async () => {
      const mockEventData = {
        title: 'Test Event',
        startTime: '2025-01-10T10:00:00Z',
        endTime: '2025-01-10T12:00:00Z',
        type: 'team',
        createdBy: 'auth0|user123',
        participants: [
          {
            email: 'john.doe@example.com',
            name: 'John Doe',
            role: 'organizer',
          },
          { email: 'jane.doe@example.com', name: 'Jane Doe', role: 'viewer' },
        ],
      };

      const createdEvent = { id: '1', ...mockEventData, participants: [] };
      eventModelMock.create.mockResolvedValue(createdEvent);
      eventModelMock.findByPk.mockResolvedValue({
        ...createdEvent,
        participants: mockEventData.participants,
      });

      participantServiceMock.findOrCreate.mockImplementation(
        ({ email, name, role }) =>
          Promise.resolve({
            id: '2',
            email,
            name,
            role,
            eventId: '1',
          }),
      );

      const result = await service.createEvent(mockEventData);

      expect(eventModelMock.create).toBeCalledWith(
        expect.objectContaining({
          title: mockEventData.title,
          startTime: mockEventData.startTime,
          endTime: mockEventData.endTime,
          type: mockEventData.type,
          createdBy: mockEventData.createdBy,
        }),
      );

      expect(participantServiceMock.findOrCreate).toBeCalledTimes(
        mockEventData.participants.length,
      );
      expect(result).toEqual({
        ...createdEvent,
        participants: mockEventData.participants,
      });
    });

    it('should throw an error if startTime is after or equal to endTime', async () => {
      const mockEventData = {
        title: 'Test Event',
        startTime: '2025-01-10T12:00:00Z',
        endTime: '2025-01-10T10:00:00Z',
        type: 'team',
        createdBy: 'auth0|user123',
        participants: [],
      };

      await expect(service.createEvent(mockEventData)).rejects.toThrowError(
        'End time must be after start time',
      );

      expect(eventModelMock.create).not.toBeCalled();
    });
  });

  describe('getEventById', () => {
    it('should return the event if found', async () => {
      const mockEvent = {
        id: '1',
        title: 'Test Event',
        startTime: '2025-01-10T10:00:00Z',
        endTime: '2025-01-10T12:00:00Z',
        type: 'team',
        participants: [],
      };

      eventModelMock.findByPk.mockResolvedValue(mockEvent);

      const result = await service.getEventById('1');

      expect(eventModelMock.findByPk).toBeCalledWith('1', {
        include: { all: true },
      });
      expect(result).toEqual(mockEvent);
    });

    it('should throw an error if event is not found', async () => {
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

      expect(eventModelMock.findByPk).toBeCalledWith('1');
      expect(participantServiceMock.deleteParticipantsByEvent).toBeCalledWith(
        '1',
      );
      expect(mockEvent.destroy).toBeCalled();
      expect(result).toEqual({ message: 'Event with ID 1 has been deleted' });
    });

    it('should throw an error if event is not found', async () => {
      eventModelMock.findByPk.mockResolvedValue(null);

      await expect(service.deleteEvent('1')).rejects.toThrowError(
        'Event with ID 1 not found',
      );
    });
  });

  describe('checkConflicts', () => {
    it('should return conflicting users', async () => {
      const mockCheckConflictsDto = {
        startTime: '2025-01-10T10:00:00Z',
        endTime: '2025-01-10T12:00:00Z',
        userIds: ['1', '2'],
      };

      const mockEvents = [
        {
          id: '1',
          startTime: '2025-01-10T09:00:00Z',
          endTime: '2025-01-10T11:00:00Z',
          participants: [
            {
              id: '1',
            },
          ],
        },
        {
          id: '2',
          startTime: '2025-01-10T11:00:00Z',
          endTime: '2025-01-10T13:00:00Z',
          participants: [
            {
              id: '2',
            },
          ],
        },
      ];

      eventModelMock.findAll.mockResolvedValue(mockEvents);

      const result = await service.checkConflicts(mockCheckConflictsDto);

      expect(eventModelMock.findAll).toBeCalledWith({
        where: {
          [Op.and]: [
            {
              [Op.or]: mockCheckConflictsDto.userIds.map((userId) => ({
                participants: { [Op.contains]: [userId] },
              })),
            },
            {
              [Op.or]: [
                {
                  startTime: { [Op.lte]: mockCheckConflictsDto.endTime },
                  endTime: { [Op.gte]: mockCheckConflictsDto.startTime },
                },
              ],
            },
          ],
        },
        include: { all: true },
      });

      expect(result).toEqual({ conflictingUsers: ['1', '2'] });
    });

    it('should throw an error if startTime is after or equal to endTime', async () => {
      const mockCheckConflictsDto = {
        startTime: '2025-01-10T12:00:00Z',
        endTime: '2025-01-10T10:00:00Z',
        userIds: ['1', '2'],
      };

      await expect(
        service.checkConflicts(mockCheckConflictsDto),
      ).rejects.toThrowError('Start time must be before end time');

      expect(eventModelMock.findAll).not.toBeCalled();
    });
  });

  describe('searchEvents', () => {
    it('should return events matching the query', async () => {
      const mockQuery = 'team';

      eventModelMock.findAll.mockResolvedValue([mockEvents[0]]);

      const result = await service.searchEvents(mockQuery);

      expect(eventModelMock.findAll).toBeCalledWith({
        where: {
          [Op.or]: [
            { title: { [Op.iLike]: `%${mockQuery}%` } },
            { type: { [Op.iLike]: `%${mockQuery}%` } },
          ],
        },
        include: [
          {
            association: 'participants',
            where: {
              [Op.or]: [
                { name: { [Op.iLike]: `%${mockQuery}%` } },
                { email: { [Op.iLike]: `%${mockQuery}%` } },
              ],
            },
            required: false,
          },
        ],
      });

      expect(result).toEqual([mockEvents[0]]);
    });

    it('should return events with participants matching the query', async () => {
      const mockQuery = 'john';
      const mockEvents = [
        {
          id: '1',
          title: 'Team Meeting',
          type: 'team',
          startTime: '2025-01-10T10:00:00Z',
          endTime: '2025-01-10T12:00:00Z',
          participants: [
            { id: 'p1', name: 'John Doe', email: 'john.doe@example.com' },
          ],
        },
      ];

      eventModelMock.findAll.mockResolvedValue(mockEventsWithParticipant);

      const result = await service.searchEvents(mockQuery);

      expect(eventModelMock.findAll).toBeCalledWith({
        where: {
          [Op.or]: [
            { title: { [Op.iLike]: `%${mockQuery}%` } },
            { type: { [Op.iLike]: `%${mockQuery}%` } },
          ],
        },
        include: [
          {
            association: 'participants',
            where: {
              [Op.or]: [
                { name: { [Op.iLike]: `%${mockQuery}%` } },
                { email: { [Op.iLike]: `%${mockQuery}%` } },
              ],
            },
            required: false,
          },
        ],
      });

      expect(result).toEqual(mockEvents);
    });
  });
});
