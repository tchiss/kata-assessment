import { CreateEventInputDto } from './create-event.dto';
import { PartialType } from '@nestjs/swagger';

export class UpdateEventInputDto extends PartialType(CreateEventInputDto) {}
