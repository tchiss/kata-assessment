export interface Participant {
  id?: string;
  name: string;
  email: string;
  role: string;
}

export enum EVENT_TYPE {
  INIT = "Init",
  PERSONAL = "Personal",
  TEAM = "Team",
  PROJECT = "Project",
}

export interface Event {
  id?: string;
  title: string;
  startTime: string;
  endTime: string;
  type: EVENT_TYPE;
  participants: Participant[];
}

export interface EventOutput {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: EVENT_TYPE;
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
}

export interface EventConflict {
  startTime: string;
  endTime: string;
  emails: string[];
}
