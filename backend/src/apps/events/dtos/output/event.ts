import { ParticipantOutput } from '../../../participants/dtos/output/participant';

export class EventOutput {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  type: string;
  createdBy: string;
  participants: ParticipantOutput[];
}
