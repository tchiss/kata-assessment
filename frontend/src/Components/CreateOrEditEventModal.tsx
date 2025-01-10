"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FormGroup,
  Input,
  Label,
  ListGroup,
  ListGroupItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "reactstrap";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Event, EVENT_TYPE, Participant } from "@/Types/EventType";
import { useAppDispatch } from "@/Redux/Hooks";
import { checkConflicts } from "@/Redux/Reducers/EventSlice";

const EventSchema = Yup.object().shape({
  title: Yup.string().required("Titre requis"),
  startTime: Yup.date().required("Date de début requise"),
  endTime: Yup.date()
    .required("Date de fin requise")
    .min(Yup.ref("startTime"), "La date de fin doit être postérieure à la date de début"),
  type: Yup.string().required("Type requis"),
});

interface Props {
  isOpen: boolean;
  toggle: () => void;
  onSave: (event: Event) => void;
  isSaving?: boolean;
  eventToEdit?: Event;
}

const CreateOrEditEventModal: React.FC<Props> = ({ isOpen, toggle, onSave, eventToEdit, isSaving }) => {
  const dispatch = useAppDispatch();
  const [formValues, setFormValues] = useState<Event>({
    id: eventToEdit?.id,
    title: eventToEdit?.title || "",
    startTime: eventToEdit?.startTime || "",
    endTime: eventToEdit?.endTime || "",
    type: eventToEdit?.type || EVENT_TYPE.PERSONAL,
    participants: eventToEdit?.participants || [],
  });

  const [participants, setParticipants] = useState<Participant[]>(formValues.participants);
  const [participantName, setParticipantName] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");
  const [participantRole, setParticipantRole] = useState<"viewer" | "editor" | "organizer">("viewer");
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

  useEffect(() => {
    if (isOpen && eventToEdit) {
      setFormValues({
        id: eventToEdit.id,
        title: eventToEdit.title || "",
        startTime: eventToEdit.startTime || "",
        endTime: eventToEdit.endTime || "",
        type: eventToEdit.type || EVENT_TYPE.PERSONAL,
        participants: eventToEdit.participants || [],
      });
      setParticipants(eventToEdit.participants || []);
    } else if (isOpen) {
      setFormValues({
        id: undefined,
        title: "",
        startTime: "",
        endTime: "",
        type: EVENT_TYPE.PERSONAL,
        participants: [],
      });
      setParticipants([]);
    }
  }, [isOpen, eventToEdit]);

  const handleAddParticipant = async (ev: Event) => {
    if (!participantName || !participantEmail) {
      setAlertMessage("Nom et email sont requis pour ajouter un participant.");
      return;
    }

    if (!ev.startTime || !ev.endTime) {
      setAlertMessage(
        "Veuillez définir les horaires de début et de fin avant d'ajouter un participant."
      );
      return;
    }

    try {
      setIsCheckingConflicts(true);
      const newParticipants = participants.filter(
        (p) => !eventToEdit?.participants.some((existing) => existing.email === p.email)
      );

      const emailList = [...newParticipants.map((p) => p.email), participantEmail];
      const conflictCheckPayload = {
        startTime: ev.startTime,
        endTime: ev.endTime,
        emails: emailList,
      };

      const result = await dispatch(checkConflicts(conflictCheckPayload)).unwrap();

      if (result.conflictedEvents && result.conflictedEvents.length > 0) {
        setAlertMessage(
          "Conflit détecté avec un autre événement. Veuillez ajuster les horaires ou participants."
        );
        return;
      }

      setParticipants([
        ...participants,
        { name: participantName, email: participantEmail, role: participantRole },
      ]);

      setParticipantName("");
      setParticipantEmail("");
      setParticipantRole("viewer");
      setAlertMessage(null);
    } catch (error) {
      setAlertMessage("Erreur lors de la vérification des conflits. Veuillez réessayer.");
      console.error("Erreur lors de la vérification des conflits :", error);
    } finally {
      setIsCheckingConflicts(false);
    }
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormValues({
      id: undefined,
      title: "",
      startTime: "",
      endTime: "",
      type: EVENT_TYPE.PERSONAL,
      participants: [],
    });
    setParticipants([]);
    setParticipantName("");
    setParticipantEmail("");
    setParticipantRole("viewer");
    setAlertMessage(null);
  };

  const handleCancel = () => {
    resetForm();
    toggle();
  };

  const handleSubmit = (values: Event) => {
    onSave({ ...values, participants });
    resetForm();
    toggle();
  };

  return (
    <Modal isOpen={isOpen} toggle={handleCancel} size="lg">
      <ModalHeader toggle={handleCancel}>
        {eventToEdit ? "Modifier l'Événement" : "Créer un Nouvel Événement"}
      </ModalHeader>
      <ModalBody>
        {alertMessage && (
          <Alert color="danger" toggle={() => setAlertMessage(null)}>
            {alertMessage}
          </Alert>
        )}
        <Formik
          initialValues={formValues}
          validationSchema={EventSchema}
          onSubmit={handleSubmit}
          enableReinitialize={true}
        >
          {({ errors, touched, values, handleChange, handleBlur, setFieldValue }) => (
            <Form>
              <FormGroup>
                <Label for="title">Titre</Label>
                <Input
                  name="title"
                  type="text"
                  className={`form-control ${touched.title && errors.title ? "is-invalid" : ""}`}
                  value={values.title}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Titre de l'événement"
                />
                {errors.title && touched.title && (
                  <div className="text-danger">{errors.title}</div>
                )}
              </FormGroup>
              <FormGroup>
                <Label for="type">Type</Label>
                <Input
                  name="type"
                  type="select"
                  className={`form-control ${touched.type && errors.type ? "is-invalid" : ""}`}
                  value={values.type}
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  <option value="Personal">Personnel</option>
                  <option value="Team">Équipe</option>
                  <option value="Project">Projet</option>
                </Input>
                {errors.type && touched.type && (
                  <div className="text-danger">{errors.type}</div>
                )}
              </FormGroup>
              <FormGroup>
                <Label>Début</Label>
                <DatePicker
                  selected={values.startTime ? new Date(values.startTime) : null}
                  onChange={(date) => setFieldValue("startTime", date?.toISOString())}
                  minDate={new Date()}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="Pp"
                  className={`form-control datepicker-input ${
                    touched.startTime && errors.startTime ? "is-invalid" : ""
                  }`}
                />
                {errors.startTime && touched.startTime && (
                  <div className="text-danger">{errors.startTime}</div>
                )}
              </FormGroup>
              <FormGroup>
                <Label>Fin</Label>
                <DatePicker
                  selected={values.endTime ? new Date(values.endTime) : null}
                  onChange={(date) => setFieldValue("endTime", date?.toISOString())}
                  minDate={values.startTime ? new Date(values.startTime) : new Date()}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="Pp"
                  className={`form-control datepicker-input ${
                    touched.endTime && errors.endTime ? "is-invalid" : ""
                  }`}
                />
                {errors.endTime && touched.endTime && (
                  <div className="text-danger">{errors.endTime}</div>
                )}
              </FormGroup>
              <FormGroup>
                <Label>Participants</Label>
                <div className="d-flex mb-3">
                  <Input
                    type="text"
                    placeholder="Nom"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    className="me-2"
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={participantEmail}
                    onChange={(e) => setParticipantEmail(e.target.value)}
                    className="me-2"
                  />
                  <Input
                    type="select"
                    value={participantRole}
                    onChange={(e) => setParticipantRole(e.target.value as "viewer" | "editor" | "organizer")}
                    className="me-2"
                  >
                    <option value="viewer">Peut voir</option>
                    <option value="editor">Peut modifier</option>
                    <option value="organizer">Peut organiser</option
                    >
                  </Input>
                  <Button
                    color="success"
                    onClick={() => handleAddParticipant(values)}
                    disabled={isCheckingConflicts}
                  >
                    {isCheckingConflicts ? "Vérification..." : "Ajouter"}
                  </Button>
                </div>
                <ListGroup>
                  {participants.map((participant, index) => (
                    <ListGroupItem key={index} className="d-flex justify-content-between">
                      <div>
                        {participant.name} ({participant.email}) -{" "}
                        {participant.role === "viewer"
                          ? "Peut voir"
                          : participant.role === "editor"
                            ? "Peut modifier"
                            : "Peut organiser"}
                      </div>
                      <Button
                        color="danger"
                        size="sm"
                        onClick={() => handleRemoveParticipant(index)}
                      >
                        Supprimer
                      </Button>
                    </ListGroupItem>
                  ))}
                </ListGroup>
              </FormGroup>
              <ModalFooter>
                <Button color="primary" type="submit" disabled={isSaving}>
                  {isSaving ? "Enregistrement..." : "Enregistrer"}
                </Button>
                <Button color="secondary" onClick={handleCancel}>
                  Annuler
                </Button>
              </ModalFooter>
            </Form>
          )}
        </Formik>
      </ModalBody>
    </Modal>
  );
};

export default CreateOrEditEventModal;
