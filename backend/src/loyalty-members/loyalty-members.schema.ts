import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LoyaltyMemberDocument = LoyaltyMember & Document;

@Schema({ timestamps: true })
export class LoyaltyMember {
  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customerId!: Types.ObjectId;

  @Prop() loyaltyId!: string;
  @Prop() tier!: string;
  @Prop() status!: string;
  @Prop() points!: number;
  @Prop() joinedAt!: Date;
}
export const LoyaltyMemberSchema =
  SchemaFactory.createForClass(LoyaltyMember);
