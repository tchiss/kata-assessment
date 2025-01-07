"use client";
import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import { DatesSetArg, EventClickArg } from "@fullcalendar/core";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useRouter } from "next/navigation";
import { Button, Container } from "reactstrap";
import { useAppDispatch, useAppSelector } from "@/Redux/Hooks";
import { fetchEvents } from "@/Redux/Reducers/EventSlice";
import { Event } from "@/Types/EventType";
import CreateOrEditEventModal from "@/Components/CreateOrEditEventModal";

const CalendarPage: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { events, loading } = useAppSelector((state) => state.events);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);

  useEffect(() => {
    dispatch(fetchEvents());
  }, [dispatch]);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleAddEvent = () => {
    setEventToEdit(null);
    toggleModal();
  };

  const handleEditEvent = (info: EventClickArg) => {
    const clickedEvent = events.find((event: Event) => event.id === info.event.id);
    if (clickedEvent) {
      setEventToEdit(clickedEvent);
      toggleModal();
    }
  };

  const handleSave = (updatedEvent: Event) => {
    toggleModal();
  };

  const navigateToEventList = () => {
    router.push("/events/list");
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

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
          events={events.map((event: Event) => ({
            id: event.id,
            title: event.title,
            start: event.startTime,
            end: event.endTime,
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
