import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
} from 'sequelize-typescript';
import { Participant } from '../../participants/models/participant.model';

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

  @Column({ type: DataType.STRING, allowNull: false })
  type: string;

  @HasMany(() => Participant)
  participants: Participant[];
}
