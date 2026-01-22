import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';


export enum TicketStatus {
  VALID = 'VALID',
  SCANNED = 'SCANNED',
  REFUNDED = 'REFUNDED',
}

export type TicketDocument = Ticket & Document;

@Schema({ timestamps: true })
export class Ticket {
  @Prop({ unique: true }) ticketCode!: string;

  @Prop({ type: Types.ObjectId, ref: 'Event' }) eventId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Order' }) orderId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Customer' }) customerId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Seat' }) seatId?: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Zone' }) zoneId!: Types.ObjectId;

  @Prop() pricePaid!: number;
  @Prop() discountApplied!: number;

  @Prop({ type: String, enum: TicketStatus })
  status!: TicketStatus;

  @Prop() scannedAt?: Date;
  @Prop({ type: Object }) loyaltySnapshot?: object;
}
export const TicketSchema = SchemaFactory.createForClass(Ticket);
