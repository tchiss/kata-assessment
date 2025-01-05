import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Event } from './models/event.model';
import { EventService } from './event.service';
import { ParticipantModule } from '../participants/participant.module';
import { EventController } from './event.controller';

@Module({
  imports: [SequelizeModule.forFeature([Event]), ParticipantModule],
  controllers: [EventController],
  providers: [EventService],
})
export class EventModule {}
