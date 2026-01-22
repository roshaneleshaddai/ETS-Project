import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LoyaltyDiscountRuleDocument = LoyaltyDiscountRule & Document;

@Schema()
export class LoyaltyDiscountRule {
  @Prop() tier!: string;
  @Prop({ type: Types.ObjectId, ref: 'Event' }) eventId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Zone' }) zoneId!: Types.ObjectId;
  @Prop() discountType!: string;
  @Prop() discountValue!: number;
  @Prop() validTo!: Date;
  @Prop() active!: boolean;
}
export const LoyaltyDiscountRuleSchema =
  SchemaFactory.createForClass(LoyaltyDiscountRule);
