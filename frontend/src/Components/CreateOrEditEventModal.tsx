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
import { Event, EVENT_TYPE, Participant } from '@/Types/EventType';

const EventSchema = Yup.object().shape({
  title: Yup.string().required("Titre requis"),
  start: Yup.date().required("Date de début requise"),
  end: Yup.date()
    .required("Date de fin requise")
    .min(Yup.ref("start"), "La date de fin doit être postérieure à la date de début"),
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
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantName, setParticipantName] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");

  useEffect(() => {
    if (isOpen && eventToEdit) {
      setParticipants(eventToEdit.participants || []);
      setStartDate(new Date(eventToEdit.start));
      setEndDate(new Date(eventToEdit.end));
    } else if (isOpen) {
      setParticipants([]);
      setStartDate(null);
      setEndDate(null);
    }
  }, [isOpen, eventToEdit]);

  const handleAddParticipant = () => {
    if (participantName && participantEmail) {
      setParticipants([
        ...participants,
        { id: String(new Date().getTime()), name: participantName, email: participantEmail },
      ]);
      setParticipantName("");
      setParticipantEmail("");
    }
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter((participant) => participant.id !== id));
  };

  const handleSubmit = (values: Event) => {
    const updatedEvent = {
      ...values,
      start: startDate ? startDate.toISOString() : "",
      end: endDate ? endDate.toISOString() : "",
      participants,
    };
    onSave(updatedEvent);
    toggle();
  };

  const initialValues: Event = eventToEdit || {
    id: undefined,
    title: "",
    start: "",
    end: "",
    type: EVENT_TYPE.INIT,
    participants: [],
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
                  className={`form-control ${
                    touched.title && errors.title ? "is-invalid" : ""
                  }`}
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
                  className={`form-control ${
                    touched.type && errors.type ? "is-invalid" : ""
                  }`}
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
                  selected={startDate}
                  onChange={(date) => {
                    setStartDate(date);
                    setFieldValue("start", date?.toISOString());
                  }}
                  minDate={new Date()}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="Pp"
                  className={`form-control datepicker-input ${
                    touched.start && errors.start ? "is-invalid" : ""
                  }`}
                  placeholderText="Sélectionnez la date et l'heure de début"
                />
                {errors.start && touched.start && (
                  <div className="text-danger">{errors.start}</div>
                )}
              </FormGroup>
              <FormGroup>
                <Label>Fin</Label>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => {
                    setEndDate(date);
                    setFieldValue("end", date?.toISOString());
                  }}
                  minDate={new Date()}
                  showTimeSelect
                  minTime={new Date()}
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="Pp"
                  className={`form-control datepicker-input ${
                    touched.end && errors.end ? "is-invalid" : ""
                  }`}
                  placeholderText="Sélectionnez la date et l'heure de fin"
                />
                {errors.end && touched.end && (
                  <div className="text-danger">{errors.end}</div>
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
                      {participant.name} ({participant.email})
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
