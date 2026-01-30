import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerDocument = Customer & Document;

export enum LoyaltyTier {
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

@Schema({ _id: false })
class LoyaltyData {
  @Prop() loyaltyId: string;
  @Prop({ type: String, enum: LoyaltyTier, default: LoyaltyTier.SILVER })
  tier: LoyaltyTier;
  @Prop({ default: 0 }) points: number;
  @Prop() joinedAt: Date;
}

@Schema({ timestamps: true })
export class Customer {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({
    type: { name: String, email: String, phone: String },
    _id: false,
  })
  encryptedPII: { name: string; email: string; phone: string };

  /* Optimized: Merged from old LoyaltyMember table */
  @Prop({ type: LoyaltyData, default: () => ({}) })
  loyalty: LoyaltyData;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Event' }], default: [] })
  likedEvents: Types.ObjectId[];
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
