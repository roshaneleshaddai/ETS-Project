import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VenueDocument = Venue & Document;

@Schema({ _id: false })
export class Zone {
  @Prop({ required: true })
  id: string; // z1, z2

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  base_price: number;
}

export const ZoneSchema = SchemaFactory.createForClass(Zone);

@Schema({ _id: false })
export class Seat {
  @Prop({ required: true })
  s_id: string; // a1, a2

  @Prop({ required: true })
  z_id: string; // references zone.id

  @Prop({ required: true })
  row: string;

  @Prop({ required: true })
  num: number;

  @Prop({ required: true })
  x: number;

  @Prop({ required: true })
  y: number;
}

export const SeatSchema = SchemaFactory.createForClass(Seat);

@Schema({ timestamps: true })
export class Venue {
  @Prop({ required: true })
  name: string;

  @Prop()
  location: string;

  @Prop({ type: [ZoneSchema], required: true })
  zones: Zone[];

  @Prop({ type: [SeatSchema], required: true })
  seats: Seat[];
}

export const VenueSchema = SchemaFactory.createForClass(Venue);
