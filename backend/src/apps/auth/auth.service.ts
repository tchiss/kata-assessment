import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ManagementClient, AuthenticationClient } from 'auth0';
import { Auth0ConfigType } from '../../config/env.type';

@Injectable()
export class AuthService {
  private readonly managementClient: ManagementClient;
  private readonly authenticationClient: AuthenticationClient;
  private readonly logger = new Logger(AuthService.name);
  constructor(private readonly configService: ConfigService) {
    const authConfig = this.configService.get<Auth0ConfigType>('auth0');
    this.managementClient = new ManagementClient({
      domain: authConfig.domain,
      clientId: authConfig.clientId,
      clientSecret: authConfig.clientSecret,
      audience: authConfig.audience,
    });

    this.authenticationClient = new AuthenticationClient({
      domain: authConfig.domain,
      clientId: authConfig.clientId,
      clientSecret: authConfig.clientSecret,
    });
  }

  async findUserByEmail(email: string) {
    try {
      const userResponse = await this.managementClient.usersByEmail.getByEmail({
        email,
      });

      return userResponse.data.length > 0 ? userResponse.data[0] : null;
    } catch (error) {
      this.logger.error('Failed to find user by email:', error);
      throw error;
    }
  }

  async createUser(user: { email: string; name: string }) {
    try {
      const userResponse = await this.managementClient.users.create({
        email: user.email,
        name: user.name,
        email_verified: true,
        connection: 'email', // hardcoded Only for technical test
      });
      return userResponse.data;
    } catch (e) {
      this.logger.error('Failed to create user:', e);
      throw e;
    }
  }
}
