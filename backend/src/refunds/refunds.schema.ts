import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RefundDocument = Refund & Document;

@Schema({ timestamps: true })
export class Refund {
  @Prop({ type: Types.ObjectId, ref: 'Ticket' })
  ticketId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId!: Types.ObjectId;

  @Prop() amount!: number;
  @Prop() reason!: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  initiatedBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop() gatewayRefundId?: string;
  @Prop() status!: string;
}
export const RefundSchema = SchemaFactory.createForClass(Refund);
