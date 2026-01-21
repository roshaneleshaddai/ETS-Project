import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event } from './events.schema';

@Injectable()
export class EventsService {
  constructor(@InjectModel(Event.name) private eventModel: Model<Event>) {}

  async create(event: Event): Promise<Event> {
    const createdEvent = new this.eventModel(event);
    return createdEvent.save();
  }

  async findAll(): Promise<Event[]> {
    return this.eventModel.find().exec();
  }

  async findById(id: string): Promise<Event> {
    const event = await this.eventModel.findById(id).exec();
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return event;
  }

  async update(id: string, event: Event): Promise<Event> {
    const updatedEvent = await this.eventModel
      .findByIdAndUpdate(id, event, { new: true })
      .exec();
    if (!updatedEvent) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return updatedEvent;
  }

  async delete(id: string): Promise<Event> {
    const deletedEvent = await this.eventModel.findByIdAndDelete(id).exec();
    if (!deletedEvent) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return deletedEvent;
  }
}
