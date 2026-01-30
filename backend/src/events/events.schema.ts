import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EventDocument = Event & Document;

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  SOLD_OUT = 'SOLD_OUT',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum EventCategory {
  MUSIC = 'MUSIC',
  SPORTS = 'SPORTS',
  THEATER = 'THEATER',
  COMEDY = 'COMEDY',
}

/* Optimized: Zone is now embedded, not a separate collection */
@Schema({ _id: false })
class EventZone {
  @Prop({ required: true }) name: string; // e.g. "VIP"
  @Prop({ required: true }) price: number;
  @Prop({ default: 0 }) capacity: number; // For General Admission
}

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true }) name: string;
  @Prop() description?: string;
  @Prop() posterUrl?: string;

  @Prop({ type: Types.ObjectId, ref: 'Venue', required: true, index: true })
  venueId: Types.ObjectId;

  /* Schedules */
  @Prop({ required: true, index: true }) startDateTime: Date;
  @Prop({ required: true }) endDateTime: Date;

  /* Configuration */
  @Prop({
    type: String,
    enum: EventStatus,
    default: EventStatus.DRAFT,
    index: true,
  })
  status: EventStatus;

  @Prop({ type: String, enum: EventCategory, index: true })
  category: EventCategory;

  @Prop({ default: 'SEATED' }) seatingType: 'SEATED' | 'GA' | 'MIXED';
  @Prop({ default: 'INR' }) currency: string;

  /* Embedded Pricing Zones */
  @Prop({ type: [EventZone], default: [] })
  zones: EventZone[];

  @Prop({ default: 0 }) likes: number;
}

export const EventSchema = SchemaFactory.createForClass(Event);
