export interface Participant {
  id?: string;
  name: string;
  email: string;
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
  start: string;
  end: string;
  type: EVENT_TYPE;
  participants: Participant[];
}
