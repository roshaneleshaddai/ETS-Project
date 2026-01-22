import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum WalletStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export type WalletDocument = Wallet & Document;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customerId!: Types.ObjectId;

  @Prop() balance!: number;
  @Prop() currency!: string;

  @Prop({ type: String, enum: WalletStatus })
  status!: WalletStatus;
}
export const WalletSchema = SchemaFactory.createForClass(Wallet);
