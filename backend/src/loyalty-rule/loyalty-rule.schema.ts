import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/* --- REFUND SCHEMA --- */
export type RefundDocument = Refund & Document;

export enum RefundStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSED = 'PROCESSED',
}

@Schema({ timestamps: true })
export class Refund {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Ticket' })
  ticketId?: Types.ObjectId; // Optional: if refunding specific ticket in an order

  @Prop({ required: true }) amount: number;
  @Prop({ required: true }) reason: string;

  @Prop({ type: String, enum: RefundStatus, default: RefundStatus.REQUESTED })
  status: RefundStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  processedBy?: Types.ObjectId;
}

export const RefundSchema = SchemaFactory.createForClass(Refund);

/* --- LOYALTY RULE SCHEMA --- */
export type LoyaltyRuleDocument = LoyaltyRule & Document;

@Schema()
export class LoyaltyRule {
  @Prop({ required: true }) minTier: string; // e.g. "GOLD"

  @Prop({ type: Types.ObjectId, ref: 'Event' })
  eventId?: Types.ObjectId; // Null means applies to all events

  @Prop({ enum: ['PERCENTAGE', 'FLAT'], required: true })
  discountType: string;

  @Prop({ required: true }) discountValue: number;

  @Prop({ default: true }) isActive: boolean;
}

export const LoyaltyRuleSchema = SchemaFactory.createForClass(LoyaltyRule);
