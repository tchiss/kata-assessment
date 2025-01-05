import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { ParticipantService } from '../../../src/apps/participants/participant.service';
import { AuthService } from '../../../src/apps/auth/auth.service';
import { Participant } from '../../../src/apps/participants/models/participant.model';

describe('ParticipantService', () => {
  let service: ParticipantService;
  let participantModelMock: any;
  let authServiceMock: any;

  beforeEach(async () => {
    participantModelMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      destroy: jest.fn(),
    };

    authServiceMock = {
      createUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantService,
        {
          provide: getModelToken(Participant),
          useValue: participantModelMock,
        },
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    service = module.get<ParticipantService>(ParticipantService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreate', () => {
    it('should return an existing participant', async () => {
      const mockParticipant = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };

      participantModelMock.findOne.mockResolvedValue(mockParticipant);

      const result = await service.findOrCreate({
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(participantModelMock.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        attributes: { exclude: ['auth0Id'] },
      });
      expect(result).toEqual(mockParticipant);
    });

    it('should create a new participant if not found', async () => {
      participantModelMock.findOne.mockResolvedValue(null);

      authServiceMock.createUser.mockResolvedValue({
        user_id: 'auth0|123',
        email: 'test@example.com',
        name: 'Test User',
      });

      participantModelMock.create.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        auth0Id: 'auth0|123',
        toJSON: jest.fn().mockReturnValue({
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
        }),
      });

      const result = await service.findOrCreate({
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(participantModelMock.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        attributes: { exclude: ['auth0Id'] },
      });
      expect(authServiceMock.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(participantModelMock.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        auth0Id: 'auth0|123',
      });
      expect(result).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should throw an error if createUser fails', async () => {
      participantModelMock.findOne.mockResolvedValue(null);
      authServiceMock.createUser.mockRejectedValue(new Error('Auth0 error'));

      await expect(
        service.findOrCreate({
          email: 'test@example.com',
          name: 'Test User',
        }),
      ).rejects.toThrow('Could not find or create participant');

      expect(participantModelMock.create).not.toHaveBeenCalled();
    });
  });

  describe('deleteParticipantsByEvent', () => {
    it('should delete participants by event ID', async () => {
      participantModelMock.destroy.mockResolvedValue(1);

      const result = await service.deleteParticipantsByEvent('event123');

      expect(participantModelMock.destroy).toHaveBeenCalledWith({
        where: { eventId: 'event123' },
      });
      expect(result).toBeUndefined();
    });

    it('should throw an error if delete fails', async () => {
      participantModelMock.destroy.mockRejectedValue(
        new Error('Delete failed'),
      );

      await expect(
        service.deleteParticipantsByEvent('event123'),
      ).rejects.toThrow('Could not delete participants by event');
    });
  });
});
