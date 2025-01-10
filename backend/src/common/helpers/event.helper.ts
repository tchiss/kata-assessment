import { Event } from '../../apps/events/models/event.model';
import { ParticipantWithEventRole } from '../types/event.type';

export const transformEvent = (event: Event) => {
  return {
    ...event.toJSON(),
    participants: event.participants.map(
      (participant: ParticipantWithEventRole) => {
        const { EventParticipant, ...participantData } = participant.toJSON();
        return {
          ...participantData,
          role: EventParticipant.role,
        };
      },
    ),
  };
};

export const transformEvents = (events: Event[]) => events.map(transformEvent);
