import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Event } from './event.model';
import { Participant } from '../../participants/models/participant.model';
import { PARTICIPANT_ROLE } from '../../../common/types/participant.type';

@Table({ tableName: 'event_participants', timestamps: true })
export class EventParticipant extends Model {
  @ForeignKey(() => Event)
  @Column({ type: DataType.UUID, allowNull: false })
  eventId: string;

  @ForeignKey(() => Participant)
  @Column({ type: DataType.UUID, allowNull: false })
  participantId: string;

  @Column({
    type: DataType.ENUM('viewer', 'editor', 'organizer'),
    defaultValue: 'viewer',
  })
  role: PARTICIPANT_ROLE;

  @BelongsTo(() => Event, { foreignKey: 'eventId' })
  event: Event;

  @BelongsTo(() => Participant, { foreignKey: 'participantId' })
  participant: Participant;
}
