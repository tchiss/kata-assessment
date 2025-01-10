import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  BelongsToMany,
} from 'sequelize-typescript';
import { Event } from '../../events/models/event.model';
import { EventParticipant } from '../../events/models/event-participant.model';

@Table({ tableName: 'participants', timestamps: true })
export class Participant extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @Column({ type: DataType.STRING, allowNull: false })
  email: string;

  @Column({ type: DataType.STRING, allowNull: false })
  auth0Id: string;

  @BelongsToMany(() => Event, () => EventParticipant)
  events: Event[];

  @HasMany(() => EventParticipant, { foreignKey: 'participantId', onDelete: 'CASCADE' })
  eventParticipants: EventParticipant[];
}
