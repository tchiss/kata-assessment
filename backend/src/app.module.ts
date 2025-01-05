import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './apps/health/health.module';
import { ParticipantModule } from './apps/participants/participant.module';
import { EventModule } from './apps/events/event.module';
import { AuthModule } from './apps/auth/auth.module';
import loadConfig from './config/load-config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfig],
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          dialect: 'postgres',
          host: configService.get<string>('db.host'),
          port: configService.get<number>('db.port'),
          username: configService.get<string>('db.user'),
          password: configService.get<string>('db.password'),
          database: configService.get<string>('db.database'),
          autoLoadModels: true,
          synchronize: true,
          logging: true,
        };
      },
    }),
    HealthModule,
    ParticipantModule,
    EventModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
