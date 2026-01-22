import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TicketTransactionDocument = TicketTransaction & Document;

@Schema({ timestamps: true })
export class TicketTransaction {
  @Prop() transactionId!: string;

  @Prop({ type: Types.ObjectId, ref: 'Ticket' }) ticketId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Order' }) orderId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Customer' }) customerId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Event' }) eventId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Wallet' }) walletId!: Types.ObjectId;

  @Prop() transactionType!: string;
  @Prop() amount!: number;
  @Prop() currency!: string;
  @Prop() paymentMethod!: string;
  @Prop() status!: string;
}
export const TicketTransactionSchema =
  SchemaFactory.createForClass(TicketTransaction);
