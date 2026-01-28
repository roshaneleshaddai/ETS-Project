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

  async findByIds(ids: string[]): Promise<Event[]> {
    try {
      // Filter out invalid IDs and find all matching events
      const events = await this.eventModel
        .find({
          _id: { $in: ids }
        })
        .exec();
      
      // Return found events (silently skip missing ones)
      return events;
    } catch (error) {
      console.error('Error in findByIds:', error);
      // Return empty array on error instead of throwing
      return [];
    }
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
  async incrementLike(eventId: string): Promise<Event> {
      const event = await this.eventModel
        .findByIdAndUpdate(eventId, { $inc: { likes: 1 } }, { new: true })
        .exec();
  
      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }
  
      return event;
    }
  
    async decrementLike(eventId: string): Promise<Event> {
      const event = await this.eventModel
        .findByIdAndUpdate(eventId, { $inc: { likes: -1 } }, { new: true })
        .exec();
  
      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }
  
      return event;
    }
}
