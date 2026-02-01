import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TicketDocument = Ticket & Document;

export enum TicketStatus {
  VALID = 'VALID',
  USED = 'USED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class Ticket {
  @Prop({ required: true, unique: true })
  qrCode: string; // UUID string

  @Prop({ required: true, unique: true })
  ticketCode: string; // Human readable or simple code

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true })
  eventId: Types.ObjectId;

  /* Optional if General Admission */
  @Prop({ type: Types.ObjectId, ref: 'EventSeat' })
  seatId?: Types.ObjectId;

  @Prop() zoneName: string;

  @Prop({ required: true }) pricePaid: number;

  @Prop({ type: String, enum: TicketStatus, default: TicketStatus.VALID })
  status: TicketStatus;

  @Prop() scannedAt?: Date;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);
