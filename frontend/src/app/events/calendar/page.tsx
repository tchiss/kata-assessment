"use client";
import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import { DatesSetArg, EventClickArg } from "@fullcalendar/core";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Container, Alert } from "reactstrap";
import { jwtDecode } from "jwt-decode";
import { useAppDispatch, useAppSelector } from "@/Redux/Hooks";
import { fetchEventById, fetchEvents } from "@/Redux/Reducers/EventSlice";
import { Event } from "@/Types/EventType";
import CreateOrEditEventModal from "@/Components/CreateOrEditEventModal";

const CalendarPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { events, loading } = useAppSelector((state) => state.events);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [role, setRole] = useState<"viewer" | "editor" | "organizer" | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<"success" | "danger" | undefined>();

  const token = searchParams.get("token");

  // Decode token and set role
  useEffect(() => {
    if (token) {
      try {
        const decodedToken: { eventId?: string; role: "viewer" | "editor" | "organizer" } =
          jwtDecode(token);
        setRole(decodedToken.role || null);
      } catch (error) {
        console.error("Erreur lors du décodage du token :", error);
        setAlertMessage("Token invalide.");
        setAlertType("danger");
      }
    }
  }, [token]);

  useEffect(() => {
    if (events.length === 0) {
      dispatch(fetchEvents());
    }
  }, [dispatch, events.length]);

  // Load event from token
  useEffect(() => {
    if (token) {
      const decodedToken: { eventId?: string } = jwtDecode(token);
      const { eventId } = decodedToken;

      if (eventId && events.length > 0) {
        const existingEvent = events.find((event: Event) => event.id === eventId);

        if (existingEvent) {
          setEventToEdit(existingEvent);
          setIsModalOpen(true);
        } else {
          dispatch(fetchEventById({ eventId, token }))
            .unwrap()
            .then((fetchedEvent) => {
              setEventToEdit(fetchedEvent);
              setIsModalOpen(true);
            })
            .catch((error) => {
              console.error("Erreur lors de la récupération de l'événement :", error);
            });
        }
      }
    }
  }, [dispatch, token, events]);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
    if (isModalOpen) {
      router.push("/events/calendar");
    }
  };

  const handleAddEvent = () => {
    if (role === "viewer") {
      setAlertMessage("Vous n'avez pas les permissions pour créer un événement.");
      setAlertType("danger");
      return;
    }
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

  const handleSave = () => {
    toggleModal();
  };

  const navigateToEventList = () => {
    router.push("/events/list");
  };

  if (loading && !isModalOpen) {
    return <div>Chargement...</div>;
  }

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh", padding: "2rem 0" }}>
      <Container>
        {alertMessage && (
          <Alert color={alertType} toggle={() => setAlertMessage(null)}>
            {alertMessage}
          </Alert>
        )}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="mb-0">Calendrier Hebdomadaire</h1>
          <div>
            <Button color="primary" className="me-2" onClick={navigateToEventList}>
              Liste des Événements
            </Button>
            {role !== "viewer" && (
              <Button color="success" onClick={handleAddEvent}>
                Créer un Événement
              </Button>
            )}
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
          editable={role === "organizer"}
          selectable={role !== "viewer"}
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
