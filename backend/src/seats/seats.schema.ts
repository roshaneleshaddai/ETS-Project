import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';


export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  HELD = 'HELD',
  SOLD = 'SOLD',
}

export type SeatDocument = Seat & Document;

@Schema()
export class Seat {
  @Prop({ type: Types.ObjectId, ref: 'Event' })
  eventId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Zone' })
  zoneId!: Types.ObjectId;

  @Prop() seatNumber!: string;

  @Prop({ type: String, enum: SeatStatus })
  status!: SeatStatus;

  @Prop() holdExpiresAt?: Date;

  @Prop() heldBy?: string;
}
export const SeatSchema = SchemaFactory.createForClass(Seat);
