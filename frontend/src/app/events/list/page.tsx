"use client";
import React, { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardTitle,
  CardSubtitle,
  CardText,
  Button,
  Row,
  Col,
  Badge,
  Container,
  Input,
  Alert,
} from "reactstrap";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/Redux/Hooks";
import {
  fetchEvents,
  createEvent,
  updateEvent,
  checkConflicts,
  deleteEvent,
} from "@/Redux/Reducers/EventSlice";
import { Event, EventOutput } from '@/Types/EventType';
import CreateOrEditEventModal from "@/Components/CreateOrEditEventModal";
import { formatDate, translateEventType } from "@/Helpers/EventsHelper";

const EventList: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { events, loading } = useAppSelector((state) => state.events);

  const [filteredEvents, setFilteredEvents] = useState<EventOutput[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<"success" | "danger" | undefined>();



  useEffect(() => {
    dispatch(fetchEvents());
  }, [dispatch]);

  useEffect(() => {
    setFilteredEvents(events);
  }, [events]);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleCreate = () => {
    setEventToEdit(null);
    toggleModal();
  };

  const handleEdit = (event: Event) => {
    setEventToEdit(event);
    toggleModal();
  };

  const handleSave = async (event: Event | EventOutput) => {
    try {
      if (event.id) {
        const conflictCheckPayload = {
          startTime: event.startTime,
          endTime: event.endTime,
          emails: event.participants.map((participant) => participant.email),
        }
        const result = await dispatch(checkConflicts(conflictCheckPayload)).unwrap();
        if (result.conflictedEvents && result.conflictedEvents.length > 0) {
          console.warn("Conflits détectés :", result.conflictedEvents);
          alert(
            "Conflits détectés avec d'autres événements. Veuillez vérifier les horaires."
          );
          return;
        }
        await dispatch(updateEvent(event)).unwrap();
      } else {
        await dispatch(createEvent({
          title: event.title,
          type: event.type,
          startTime: event.startTime,
          endTime: event.endTime,
          participants: event.participants.map((participant) => ({
            name: participant.name,
            email: participant.email,
            role: participant.role,
          })),
        })).unwrap();
        setAlertMessage("Événement créé avec succès.");
        setAlertType("success");
      }

      toggleModal();
    } catch (error) {
      setAlertMessage("Une erreur s'est produite. Veuillez réessayer.");
      setAlertType("danger");
      console.error("Erreur lors de la sauvegarde :", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const confirm = window.confirm("Êtes-vous sûr de vouloir supprimer cet événement ?");
      if (!confirm) return;

      await dispatch(deleteEvent(id)).unwrap();
      setAlertMessage("Événement supprimé avec succès.");
      setAlertType("success");
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
      setAlertMessage("Une erreur s'est produite lors de la suppression de l'événement.");
      setAlertType("danger");
    }
  };


  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const lowerQuery = query.toLowerCase();

    const filtered = events.filter(
      (event: Event) =>
        event.title.toLowerCase().includes(lowerQuery) ||
        translateEventType(event.type).toLowerCase().includes(lowerQuery) ||
        event.participants.some(
          (participant) =>
            participant.name.toLowerCase().includes(lowerQuery) ||
            participant.email.toLowerCase().includes(lowerQuery)
        )
    );

    setFilteredEvents(filtered);
  };

  const navigateToCalendar = () => {
    router.push("/events/calendar");
  };

  if (loading) {
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
          <h1 className="mb-0">Liste des Événements</h1>
          <div>
            <Button color="primary" className="me-2" onClick={navigateToCalendar}>
              Calendrier
            </Button>
            <Button color="success" onClick={handleCreate}>
              Créer un Événement
            </Button>
          </div>
        </div>
        <Input
          type="text"
          placeholder="Rechercher par titre, type ou participant..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="mb-4"
        />
        <Row>
          {filteredEvents.map((event) => (
            <Col key={event.id} md={6} lg={4} className="mb-4">
              <Card style={{ boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", borderRadius: "10px" }}>
                <CardBody>
                  <CardTitle tag="h5">{event.title}</CardTitle>
                  <CardSubtitle className="mb-2 text-muted">
                    {translateEventType(event.type)}
                  </CardSubtitle>
                  <CardText>
                    <strong>Début :</strong> {formatDate(event.startTime)} <br />
                    <strong>Fin :</strong> {formatDate(event.endTime)}
                  </CardText>
                  <CardText>
                    <strong>Participants :</strong>
                    {event.participants.map((participant) => (
                      <Badge key={participant.id} color="info" className="me-1">
                        {participant.name}
                      </Badge>
                    ))}
                  </CardText>
                  <div className="d-flex justify-content-between">
                    <Button color="primary" size="sm" onClick={() => handleEdit(event)}>
                      Modifier
                    </Button>
                    <Button color="danger" size="sm" onClick={() => handleDelete(event.id)}>
                      Supprimer
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>
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

export default EventList;
