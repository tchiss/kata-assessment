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
import { Event, EventOutput, Participant } from '@/Types/EventType';
import CreateOrEditEventModal from "@/Components/CreateOrEditEventModal";
import { formatDate, translateEventType } from "@/Helpers/EventsHelper";

const EventList: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { events } = useAppSelector((state) => state.events);

  const [filteredEvents, setFilteredEvents] = useState<EventOutput[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<"success" | "danger" | "info" | undefined>();
  const [isSaving, setIsSaving] = useState(false);



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

  const handleUpdateEvent = async (event: Event): Promise<boolean> => {
    const modifiedFields = getModifiedFields(eventToEdit!, event);

    if (Object.keys(modifiedFields).length === 0) {
      setAlertMessage("Aucune modification détectée.");
      setAlertType("info");
      return false;
    }

    const hasDateChanges = "startTime" in modifiedFields || "endTime" in modifiedFields;

    if (hasDateChanges) {
      const hasConflicts = await checkEventConflicts(
        modifiedFields.startTime || eventToEdit!.startTime,
        modifiedFields.endTime || eventToEdit!.endTime
      );

      if (hasConflicts) {
        setAlertMessage(
          "Conflit détecté avec un autre événement. Veuillez ajuster les horaires."
        );
        setAlertType("danger");
        return false;
      }
    }

    try {
      const updatedEvent = { id: eventToEdit!.id, ...modifiedFields };
      await dispatch(updateEvent(updatedEvent)).unwrap();

      setAlertMessage("Événement modifié avec succès.");
      setAlertType("success");
      return true;
    } catch (error) {
      setAlertMessage("Une erreur s'est produite lors de la mise à jour. Veuillez réessayer.");
      setAlertType("danger");
      console.error("Erreur lors de la mise à jour :", error);
      return false;
    }
  };

  const handleCreateEvent = async (event: Event): Promise<boolean> => {
    try {
      setIsSaving(true);

      const newEvent = {
        title: event.title,
        type: event.type,
        startTime: event.startTime,
        endTime: event.endTime,
        participants: event.participants.map((participant) => ({
          name: participant.name,
          email: participant.email,
          role: participant.role,
        })),
      };

      await dispatch(createEvent(newEvent)).unwrap();
      setAlertMessage("Événement créé avec succès.");
      setAlertType("success");
      return true;
    } catch (error) {
      setAlertMessage("Une erreur s'est produite lors de la création. Veuillez réessayer.");
      setAlertType("danger");
      console.error("Erreur lors de la création :", error);
      return false;
    }
  };

  const checkEventConflicts = async (
    startTime: string,
    endTime: string,
    participants?: Participant[]
  ): Promise<boolean> => {
    try {
      const conflictCheckPayload = {
        startTime,
        endTime,
        emails: participants ? participants.map((p) => p.email) : [],
      };

      const result = await dispatch(checkConflicts(conflictCheckPayload)).unwrap();

      return result.conflictedEvents && result.conflictedEvents.length > 0;
    } catch (error) {
      console.error("Erreur lors de la vérification des conflits :", error);
      return true;
    }
  };


  const getModifiedFields = (originalEvent: Event, updatedEvent: Event): Partial<Event> => {
    const modifiedFields: Partial<Event> = {};

    for (const key in updatedEvent) {
      if (
        key !== "id" &&
        updatedEvent[key as keyof Event] !== originalEvent[key as keyof Event]
      ) {
        modifiedFields[key as keyof Event] = updatedEvent[key as keyof Event] as any;
      }
    }

    return modifiedFields;
  };

  const handleSave = async (event: Event | EventOutput) => {
    try {
      setIsSaving(true);
      if (eventToEdit) {
        await handleUpdateEvent(event);

      } else {
        await handleCreateEvent(event);
      }

      toggleModal();
      dispatch(fetchEvents());
    } catch (error) {
      setAlertMessage("Une erreur s'est produite. Veuillez réessayer.");
      setAlertType("danger");
      console.error("Erreur lors de la sauvegarde :", error);
    } finally {
      setIsSaving(false);
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
          isSaving={isSaving}
          eventToEdit={eventToEdit || undefined}
        />
      </Container>
    </div>
  );
};

export default EventList;
