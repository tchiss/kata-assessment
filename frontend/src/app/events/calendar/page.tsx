"use client";
import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import { DatesSetArg, EventClickArg } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useRouter } from "next/navigation";
import { Button, Container } from 'reactstrap';
import { Event } from '@/Types/EventType';
import { mapRawEventsToTypedEvents } from '@/Helpers/EventsHelper';
import eventsData from '@/Data/events/mockEvents.json';
import CreateOrEditEventModal from "@/Components/CreateOrEditEventModal";

const CalendarPage: React.FC = () => {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>(mapRawEventsToTypedEvents(eventsData));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleAddEvent = () => {
    setEventToEdit(null);
    toggleModal();
  };

  const handleEditEvent = (info: EventClickArg) => {
    const clickedEvent = events.find((event) => event.id === info.event.id);
    if (clickedEvent) {
      setEventToEdit(clickedEvent);
      toggleModal();
    }
  };

  const handleSave = (updatedEvent: Event) => {
    if (updatedEvent.id) {
      setEvents((prev) =>
        prev.map((event) => (event.id === updatedEvent.id ? updatedEvent : event))
      );
    } else {
      const newEvent = { ...updatedEvent, id: String(new Date().getTime()) };
      setEvents((prev) => [...prev, newEvent]);
    }
  };

  const navigateToEventList = () => {
    router.push("/events/list");
  };

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh", padding: "2rem 0" }}>
      <Container>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="mb-0">Calendrier Hebdomadaire</h1>
          <div>
            <Button color="primary" className="me-2" onClick={navigateToEventList}>
              Liste des Événements
            </Button>
            <Button color="success" onClick={handleAddEvent}>
              Créer un Événement
            </Button>
          </div>
        </div>
        <FullCalendar
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          events={events.map((event) => ({
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
          }))}
          locale="fr"
          eventClick={handleEditEvent}
          datesSet={(arg: DatesSetArg) => console.log("Dates visibles :", arg.start, arg.end)}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "timeGridWeek,timeGridDay",
          }}
          editable={true}
          selectable={true}
          nowIndicator={true}
        />
        <CreateOrEditEventModal
          isOpen={isModalOpen}
          toggle={toggleModal}
          onSave={handleSave}
          eventToEdit={eventToEdit || undefined}
        />
      </Container>
    </div>
  );
};

export default CalendarPage;

