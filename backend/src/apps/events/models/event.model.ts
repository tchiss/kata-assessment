import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  BelongsToMany,
} from 'sequelize-typescript';
import { Participant } from '../../participants/models/participant.model';
import { EventParticipant } from './event-participant.model';
import { EVENT_TYPE } from '../../../common/types/event.type';

@Table({ tableName: 'events', timestamps: true })
export class Event extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  title: string;

  @Column({ type: DataType.DATE, allowNull: false })
  startTime: Date;

  @Column({ type: DataType.DATE, allowNull: false })
  endTime: Date;

  @Column({
    type: DataType.ENUM('Personal', 'Team', 'Project'),
    defaultValue: 'Personal',
  })
  type: EVENT_TYPE;

  @BelongsToMany(() => Participant, () => EventParticipant)
  participants: Participant[];

  @HasMany(() => EventParticipant, {
    foreignKey: 'eventId',
    onDelete: 'CASCADE',
  })
  eventParticipants: EventParticipant[];
}
