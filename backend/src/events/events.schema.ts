import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum SeatingType {
  SEATED = 'SEATED',
  GENERAL_ADMISSION = 'GENERAL_ADMISSION',
  MIXED = 'MIXED',
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ON_SALE = 'ON_SALE',
  SOLD_OUT = 'SOLD_OUT',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum EventCategory {
  MUSIC = 'MUSIC',
  SPORTS = 'SPORTS',
  THEATER = 'THEATER',
  COMEDY = 'COMEDY',
  OTHER = 'OTHER',
}

@Schema({ timestamps: true })
export class Event {
  /* ================= CORE INFO ================= */

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  image?: string;

  /* ================= SOCIAL / METRICS ================= */

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: 0 })
  dislikes: number;

  /* ================= SCHEDULING ================= */

  @Prop({ required: true, index: true })
  startDateTime: Date;

  @Prop({ required: true, index: true })
  endDateTime: Date;

  /* ================= VENUE ================= */

  @Prop({
    type: Types.ObjectId,
    ref: 'Venue',
    required: true,
    index: true,
  })
  venueId: Types.ObjectId;

  /* ================= SEATING ================= */

  @Prop({
    enum: SeatingType,
    default: SeatingType.SEATED,
  })
  seatingType: SeatingType;

  /**
   * Custom pricing per zone for this event
   * Overrides venue base_price
   * Example: { "z1": 350, "z2": 250 }
   */
  @Prop({ type: Map, of: Number })
  zonePricing?: Map<string, number>;

  @Prop({ default: 'USD' })
  currency: string;

  /**
   * Seat hold duration in minutes
   * Used by EventSeats.locked_until
   */
  @Prop({ default: 10 })
  seatHoldTimeout: number;

  /* ================= CLASSIFICATION ================= */

  @Prop({
    enum: EventCategory,
    index: true,
  })
  category: EventCategory;

  /* ================= LIFECYCLE ================= */

  @Prop({
    enum: EventStatus,
    default: EventStatus.DRAFT,
    index: true,
  })
  status: EventStatus;
}

export const EventSchema = SchemaFactory.createForClass(Event);
