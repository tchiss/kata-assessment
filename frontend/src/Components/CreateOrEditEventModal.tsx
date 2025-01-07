"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  FormGroup,
  Label,
  Input,
  ListGroup,
  ListGroupItem,
} from "reactstrap";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Event, EVENT_TYPE, Participant } from "@/Types/EventType";

const EventSchema = Yup.object().shape({
  title: Yup.string().required("Titre requis"),
  startTime: Yup.date().required("Date de début requise"),
  endTime: Yup.date()
    .required("Date de fin requise")
    .min(Yup.ref("startTime"), "La date de fin doit être postérieure à la date de début"),
  type: Yup.string()
    .oneOf(["Personnel", "Équipe", "Projet"], "Type invalide")
    .required("Type requis"),
});

interface Props {
  isOpen: boolean;
  toggle: () => void;
  onSave: (event: Event) => void;
  eventToEdit?: Event;
}

const CreateOrEditEventModal: React.FC<Props> = ({ isOpen, toggle, onSave, eventToEdit }) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantName, setParticipantName] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");
  const [participantRole, setParticipantRole] = useState<"viewer" | "editor">("viewer");

  const initialValues: Event = {
    id: eventToEdit?.id,
    title: eventToEdit?.title || "",
    startTime: eventToEdit?.startTime || "",
    endTime: eventToEdit?.endTime || "",
    type: eventToEdit?.type || EVENT_TYPE.INIT,
    participants: eventToEdit?.participants || [],
  };

  useEffect(() => {
    if (isOpen && eventToEdit) {
      setParticipants(eventToEdit.participants || []);
    } else if (isOpen) {
      setParticipants([]);
    }
  }, [isOpen, eventToEdit]);

  const handleAddParticipant = () => {
    if (participantName && participantEmail) {
      setParticipants([
        ...participants,
        {
          name: participantName,
          email: participantEmail,
          role: participantRole,
        },
      ]);
      setParticipantName("");
      setParticipantEmail("");
      setParticipantRole("viewer");
    }
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter((participant) => participant.id !== id));
  };

  const handleSubmit = (values: Event) => {
    const updatedEvent = {
      ...values,
      participants,
    };
    onSave(updatedEvent);
    toggle();
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>
        {eventToEdit ? "Modifier l'Événement" : "Créer un Nouvel Événement"}
      </ModalHeader>
      <ModalBody>
        <Formik
          initialValues={initialValues}
          validationSchema={EventSchema}
          onSubmit={handleSubmit}
          enableReinitialize
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
                  <option value="">Sélectionnez un type</option>
                  <option value="Personnel">Personnel</option>
                  <option value="Équipe">Équipe</option>
                  <option value="Projet">Projet</option>
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
                  placeholderText="Sélectionnez la date et l'heure de début"
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
                  minDate={new Date()}
                  showTimeSelect
                  minTime={new Date(new Date().setHours(0, 0, 0, 0))}
                  maxTime={new Date(new Date().setHours(23, 59, 59, 999))}
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="Pp"
                  className={`form-control datepicker-input ${
                    touched.endTime && errors.endTime ? "is-invalid" : ""
                  }`}
                  placeholderText="Sélectionnez la date et l'heure de fin"
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
                    onChange={(e) => setParticipantRole(e.target.value as "viewer" | "editor")}
                    className="me-2"
                  >
                    <option value="viewer">Peut voir</option>
                    <option value="editor">Peut modifier</option>
                  </Input>
                  <Button color="success" onClick={handleAddParticipant}>
                    Ajouter
                  </Button>
                </div>
                <ListGroup>
                  {participants.map((participant) => (
                    <ListGroupItem
                      key={participant.id}
                      className="d-flex justify-content-between align-items-center"
                    >
                      {participant.name} ({participant.email}) -{" "}
                      <strong>
                        {participant.role === "viewer" ? "Peut voir" : "Peut modifier"}
                      </strong>
                      <Button
                        color="danger"
                        size="sm"
                        onClick={() => handleRemoveParticipant(participant.id!)}
                      >
                        Supprimer
                      </Button>
                    </ListGroupItem>
                  ))}
                </ListGroup>
              </FormGroup>
              <ModalFooter>
                <Button color="primary" type="submit">
                  Enregistrer
                </Button>
                <Button color="secondary" onClick={toggle}>
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
