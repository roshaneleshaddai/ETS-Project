import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';


export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  HELD = 'HELD',
  LOCKED = 'LOCKED',
  SOLD = 'SOLD',
  BLOCKED = 'BLOCKED',
}

export type SeatDocument = Seat & Document;

@Schema()
export class Seat {
  @Prop({ type: Types.ObjectId, ref: 'Event' })
  eventId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Zone' })
  zoneId!: Types.ObjectId;

  @Prop() sectionId!: string;

  @Prop() row!: string;

  @Prop() seatNumber!: string;

  @Prop({ type: Object }) position?: { x: number; y: number };

  @Prop() isAccessible?: boolean;

  @Prop() isAisle?: boolean;

  @Prop({ type: String, enum: SeatStatus })
  status!: SeatStatus;

  @Prop() holdExpiresAt?: Date;

  @Prop() heldBy?: string;
}
export const SeatSchema = SchemaFactory.createForClass(Seat);
