import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { EventService } from './event.service';
import { CreateEventInputDto } from './dtos/input/create-event.dto';
import { CheckConflictsInputDto } from './dtos/input/check-conflicts-input.dto';
import { UpdateEventInputDto } from './dtos/input/update-event.dto';

@ApiTags('Events')
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new event' })
  @ApiBody({ type: CreateEventInputDto })
  @ApiResponse({
    status: 201,
    description: 'The event has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  async createEvent(@Body() createEventInputDto: CreateEventInputDto) {
    return await this.eventService.createEvent(createEventInputDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all events' })
  @ApiResponse({ status: 200, description: 'List of events.' })
  async listEvents() {
    return await this.eventService.listEvents();
  }

  @Put(':eventId')
  @ApiOperation({ summary: 'Update an event by ID' })
  @ApiBody({ type: UpdateEventInputDto })
  @ApiResponse({ status: 200, description: 'The event has been updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  async updateEvent(
    @Param('eventId') eventId: string,
    @Body() eventDto: UpdateEventInputDto,
  ) {
    return await this.eventService.updateEvent(eventId, eventDto);
  }

  @Get(':eventId')
  @ApiOperation({ summary: 'Get an event by ID' })
  @ApiResponse({ status: 200, description: 'The event details.' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  async getEventById(
    @Param('eventId') eventId: string,
    @Headers('Authorization') authHeader?: string,
  ) {
    let role = 'viewer';
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const decoded = this.eventService.verifyInvitationToken(token);
      role = decoded.role;
    }

    const event = await this.eventService.getEventById(eventId);
    return { ...event, role };
  }

  @Delete(':eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an event by ID' })
  @ApiResponse({ status: 204, description: 'The event has been deleted.' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  async deleteEvent(@Param('eventId') eventId: string) {
    return await this.eventService.deleteEvent(eventId);
  }

  @Post('check-conflicts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check for scheduling conflicts' })
  @ApiBody({ type: CheckConflictsInputDto })
  @ApiResponse({ status: 200, description: 'Conflict check result.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  async checkConflicts(@Body() checkConflictsDto: CheckConflictsInputDto) {
    return await this.eventService.checkConflicts(checkConflictsDto);
  }

  @Get('content/search')
  @ApiOperation({ summary: 'Search for events by content' })
  @ApiQuery({
    name: 'query',
    required: false,
    description: 'Search query string',
  })
  @ApiResponse({ status: 200, description: 'Search results.' })
  async searchEvents(@Query('query') query: string) {
    if (!query) {
      return [];
    }
    return await this.eventService.searchEvents(query);
  }
}
