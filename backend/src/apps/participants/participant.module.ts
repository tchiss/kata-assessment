import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Participant } from './models/participant.model';
import { ParticipantService } from './participant.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SequelizeModule.forFeature([Participant]), AuthModule],
  providers: [ParticipantService],
  exports: [ParticipantService],
})
export class ParticipantModule {}
