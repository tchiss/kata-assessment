import { Injectable, Logger } from '@nestjs/common';
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
        email_verified: true, // hardcoded Only for technical test
        connection: 'email', // hardcoded Only for technical test
      });
      return userResponse.data;
    } catch (e) {
      this.logger.error('Failed to create user:', e);
      throw e;
    }
  }

  async assignRoleToUser(userId: string, roleId: string) {
    try {
      await this.managementClient.roles.assignUsers(
        { id: roleId },
        { users: [userId] },
      );
    } catch (error) {
      this.logger.error('Failed to assign role to user:', error);
      throw error;
    }
  }

  async getUserRoles(userId: string) {
    try {
      const rolesResponse = await this.managementClient.users.getRoles({ id: userId });
      return rolesResponse.data;
    } catch (error) {
      this.logger.error('Failed to get user roles:', error);
      throw error;
    }
  }

  async deleteUser(userId: string) {
    try {
      await this.managementClient.users.delete({ id: userId });
    } catch (error) {
      this.logger.error('Failed to delete user:', error);
      throw error;
    }
  }
}
