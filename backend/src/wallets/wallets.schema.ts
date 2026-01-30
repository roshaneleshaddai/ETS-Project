import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletDocument = Wallet & Document;

export enum WalletStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
}

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, unique: true })
  customerId: Types.ObjectId;

  @Prop({ default: 0 }) balance: number;
  @Prop({ default: 'INR' }) currency: string;

  @Prop({ type: String, enum: WalletStatus, default: WalletStatus.ACTIVE })
  status: WalletStatus;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
