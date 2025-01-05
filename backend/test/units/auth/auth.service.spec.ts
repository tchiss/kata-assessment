import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../../src/apps/auth/auth.service';

jest.mock('auth0', () => ({
  ManagementClient: jest.fn(() => ({
    usersByEmail: {
      getByEmail: jest.fn().mockResolvedValue({
        data: [],
        headers: {},
        status: 200,
        statusText: 'OK',
      }),
    },
    users: {
      create: jest.fn().mockResolvedValue({
        data: {
          user_id: 'auth0|123',
          email: 'test@example.com',
          email_verified: true,
        },
      }),
    },
  })),
  AuthenticationClient: jest.fn(() => ({
    authenticate: jest.fn(),
  })),
}));

describe('AuthService', () => {
  let service: AuthService;
  let configServiceMock: Partial<ConfigService>;

  beforeEach(async () => {
    configServiceMock = {
      get: jest.fn().mockReturnValue({
        domain: 'mock-domain.auth0.com',
        clientId: 'mockClientId',
        clientSecret: 'mockClientSecret',
        audience: 'mock-audience',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should find a user by email', async () => {
    const result = await service.findUserByEmail('test@example.com');
    expect(
      service['managementClient'].usersByEmail.getByEmail,
    ).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
    expect(result).toEqual(null);
  });

  it('should create a user', async () => {
    const result = await service.createUser({
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(service['managementClient'].users.create).toHaveBeenCalledWith({
      email: 'test@example.com',
      name: 'Test User',
      email_verified: true,
      connection: 'email',
    });
    expect(result).toEqual({
      user_id: 'auth0|123',
      email: 'test@example.com',
      email_verified: true,
    });
  });

  it('should throw an error if user creation fails', async () => {
    service['managementClient'].users.create = jest
      .fn()
      .mockRejectedValueOnce(new Error('Email already exists'));

    await expect(
      service.createUser({ email: 'test@example.com', name: 'Test User' }),
    ).rejects.toThrow('Email already exists');
  });

  it('should return the user if found', async () => {
    service['managementClient'].usersByEmail.getByEmail = jest
      .fn()
      .mockResolvedValueOnce({
        data: [{ email: 'test@example.com', user_id: 'auth0|123' }],
      });

    const result = await service.findUserByEmail('test@example.com');
    expect(result).toEqual({ email: 'test@example.com', user_id: 'auth0|123' });
  });
});
