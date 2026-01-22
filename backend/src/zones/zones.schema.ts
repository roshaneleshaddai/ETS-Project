import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';


export type ZoneDocument = Zone & Document;

@Schema({ timestamps: true })
export class Zone {
  @Prop({ type: Types.ObjectId, ref: 'Event', required: true })
  eventId!: Types.ObjectId; // FK

  @Prop() name!: string;
  @Prop() price!: number;
  @Prop() currency!: string;
}
export const ZoneSchema = SchemaFactory.createForClass(Zone);
