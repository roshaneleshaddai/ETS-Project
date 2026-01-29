import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VenueDocument = Venue & Document;

@Schema({ _id: false })
export class VenueSeat {
  @Prop({ required: true })
  row: string;

  @Prop({ required: true })
  seatNumber: number;

  @Prop({ type: Object })
  position: { x: number; y: number };

  @Prop()
  isAccessible: boolean;

  @Prop()
  isAisle: boolean;
}
export const VenueSeatSchema = SchemaFactory.createForClass(VenueSeat);

@Schema({ _id: false })
export class Section {
  @Prop({ required: true })
  sectionId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  color: string;

  @Prop([Object])
  boundary: { x: number; y: number }[];

  @Prop([VenueSeatSchema])
  seats: VenueSeat[];
}
export const SectionSchema = SchemaFactory.createForClass(Section);

@Schema({ timestamps: true })
export class Venue {
  @Prop({ required: true })
  name: string;

  @Prop()
  city: string;

  @Prop()
  location: string;

  @Prop({ type: [SectionSchema], default: [] })
  sections: Section[];

  @Prop({ type: Object })
  mapDimensions: { width: number; height: number };

  @Prop({ type: Object })
  stagePosition: { x: number; y: number };

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  totalCapacity: number;
}

export const VenueSchema = SchemaFactory.createForClass(Venue);
