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

  @Post('batch')
  async findByIds(@Body('ids') ids: string[]): Promise<Event[]> {
    return this.eventsService.findByIds(ids);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() event: Event): Promise<Event> {
    return this.eventsService.update(id, event);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<Event> {
    return this.eventsService.delete(id);
  }

  @Post(':id/like')
  async incrementLike(@Param('id') id: string): Promise<Event> {
    return this.eventsService.incrementLike(id);
  }

  @Delete(':id/like')
  async decrementLike(@Param('id') id: string): Promise<Event> {
    return this.eventsService.decrementLike(id);
  }
}
