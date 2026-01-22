import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';


export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event' })
  eventId!: Types.ObjectId;

  @Prop() totalAmount!: number;
  @Prop() currency!: string;

  @Prop({
    type: { gateway: String, transactionId: String, status: String },
    _id: false,
  })
  payment!: { gateway: string; transactionId: string; status: string };
}
export const OrderSchema = SchemaFactory.createForClass(Order);
