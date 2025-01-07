import { Event } from '../../models/event.model';

export class CreateEventOutputDto {
  event: Event;
  warnings: ConflictWarningsDto | null;
}

export class ConflictWarningsDto {
  message: string;
  conflicts: Event[];
}
