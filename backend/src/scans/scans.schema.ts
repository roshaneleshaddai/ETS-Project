import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ScanDocument = Scan & Document;

export enum ScanSyncStatus {
  REALTIME = 'REALTIME',
  OFFLINE_SYNCED = 'OFFLINE_SYNCED',
}

@Schema({ timestamps: true })
export class Scan {
  @Prop({ type: Types.ObjectId, ref: 'Ticket', required: true })
  ticketId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true })
  eventId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  gateKeeperId: Types.ObjectId;

  @Prop({ required: true }) scannedAt: Date;
  @Prop({ required: true }) deviceId: string;

  @Prop({
    type: String,
    enum: ScanSyncStatus,
    default: ScanSyncStatus.REALTIME,
  })
  syncStatus: ScanSyncStatus;
}

export const ScanSchema = SchemaFactory.createForClass(Scan);
