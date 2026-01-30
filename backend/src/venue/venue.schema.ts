import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VenueDocument = Venue & Document;

export enum VenueSeatType {
  STANDARD = 'STANDARD',
  ACCESSIBLE = 'ACCESSIBLE',
  AISLE = 'AISLE',
}

@Schema({ _id: false })
export class VenueSeat {
  @Prop({ required: true }) row: string;
  @Prop({ required: true }) number: number;
  @Prop({ required: true }) x: number;
  @Prop({ required: true }) y: number;

  @Prop({ type: String, enum: VenueSeatType, default: VenueSeatType.STANDARD })
  type: VenueSeatType;
}

@Schema({ _id: false })
export class Section {
  @Prop({ required: true }) id: string; // e.g., "BALCONY-1"
  @Prop({ required: true }) name: string;
  @Prop() color: string;
  @Prop([VenueSeat]) seats: VenueSeat[];
}

@Schema({ timestamps: true })
export class Venue {
  @Prop({ required: true }) name: string;
  @Prop({ required: true, index: true }) city: string;
  @Prop() address: string;

  @Prop({ type: [Section], default: [] })
  sections: Section[];

  @Prop({ default: true }) isActive: boolean;
}

export const VenueSchema = SchemaFactory.createForClass(Venue);
