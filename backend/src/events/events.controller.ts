import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { Event } from './events.schema';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async create(@Body() event: Event): Promise<Event> {
    return this.eventsService.create(event);
  }

  @Get()
  async findAll(): Promise<Event[]> {
    return this.eventsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Event> {
    return this.eventsService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() event: Event): Promise<Event> {
    return this.eventsService.update(id, event);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<Event> {
    return this.eventsService.delete(id);
  }
}
