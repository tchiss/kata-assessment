import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventInputDto } from './dtos/input/create-event.dto';
import { CheckConflictsInputDto } from './dtos/input/check-conflicts-input.dto';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEvent(@Body() createEventInputDto: CreateEventInputDto) {
    return await this.eventService.createEvent(createEventInputDto);
  }

  @Get(':eventId')
  async getEventById(@Param('eventId') eventId: string) {
    return await this.eventService.getEventById(eventId);
  }

  @Delete(':eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEvent(@Param('eventId') eventId: string) {
    return await this.eventService.deleteEvent(eventId);
  }

  @Post('check-conflicts')
  @HttpCode(HttpStatus.OK)
  async checkConflicts(@Body() checkConflictsDto: CheckConflictsInputDto) {
    return await this.eventService.checkConflicts(checkConflictsDto);
  }

  @Get('content/search')
  async searchEvents(@Query('query') query: string) {
    if (!query) {
      return [];
    }
    return await this.eventService.searchEvents(query);
  }
}
