import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { Event } from '../../events/models/event.model';

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

  @ForeignKey(() => Event)
  @Column({ type: DataType.UUID, allowNull: false })
  eventId: string;

  @Column({ type: DataType.STRING, allowNull: false })
  auth0Id: string;

  @Column({ type: DataType.STRING, defaultValue: 'viewer' }) // viewer | organizer | editor
  role: string;
}
