import { Participant } from '../../apps/participants/models/participant.model';

export enum EVENT_TYPE {
  PERSONAL = 'Personal',
  TEAM = 'Team',
  PROJECT = 'Project',
}

export interface ParticipantWithEventRole extends Participant {
  EventParticipant: { role: string };
}
