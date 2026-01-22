import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ScanDocument = Scan & Document;

@Schema({ timestamps: true })
export class Scan {


  @Prop({ type: Types.ObjectId, ref: 'Ticket', required: true })
  ticketId!: Types.ObjectId; // FK → tickets._id

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true })
  eventId!: Types.ObjectId; // FK → events._id

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  scannedBy!: Types.ObjectId; // FK → users._id

  @Prop({ type: Date, required: true })
  scannedAt!: Date;

  @Prop({ type: String, required: true })
  deviceId!: string;

  @Prop({ type: Boolean, default: false })
  isOfflineScan!: boolean;

  @Prop({ type: Date })
  syncedAt?: Date;
}

export const ScanSchema = SchemaFactory.createForClass(Scan);
