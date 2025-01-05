import moment from 'moment';
import { EVENT_TYPE, Event, Participant } from "@/Types/EventType";

interface RawEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: string;
  participants: Participant[];
}

export const formatDate = (dateString: string) => {
  return moment(dateString).format('DD/MM/YYYY HH:mm:ss');
};

export const mapRawEventsToTypedEvents = (rawEvents: RawEvent[]): Event[] => {
  return rawEvents.map((rawEvent) => {
    return {
      ...rawEvent,
      type: EVENT_TYPE[rawEvent.type.toUpperCase() as keyof typeof EVENT_TYPE],
    };
  });
};

// for technical assessment, use i18n library or similar to translate event type in real case
export const translateEventType = (type: EVENT_TYPE): string => {
  const translations: { [key in EVENT_TYPE]: string } = {
    [EVENT_TYPE.INIT]: "Initialisation",
    [EVENT_TYPE.PERSONAL]: "Personnel",
    [EVENT_TYPE.TEAM]: "Équipe",
    [EVENT_TYPE.PROJECT]: "Projet",
  };

  return translations[type] || type;
};
