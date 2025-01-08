import {
  Table,
  Column,
  Model,
  DataType,
  BelongsToMany,
} from 'sequelize-typescript';
import { Event } from '../../events/models/event.model';
import { PARTICIPANT_ROLE } from '../../../common/types/participant.type';
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

  @BelongsToMany(() => Event, () => EventParticipant)
  events: Event[];

  @Column({ type: DataType.STRING, allowNull: false })
  auth0Id: string;
}
