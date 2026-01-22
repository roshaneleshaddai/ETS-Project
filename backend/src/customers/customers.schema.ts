import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true })
export class Customer {
  @Prop({
    type: { name: String, email: String, phone: String },
    _id: false,
  })
  encryptedPII!: { name: string; email: string; phone: string };

  @Prop({
    type: { loyaltyId: String, verified: Boolean },
    _id: false,
  })
  loyalty!: { loyaltyId?: string; verified: boolean };
}
export const CustomerSchema = SchemaFactory.createForClass(Customer);
