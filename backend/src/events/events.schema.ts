import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Event {

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  likes: number;

  @Prop()
  image : Blob;

  @Prop()
  dislikes: number;

  @Prop({ index: true })
  startDateTime: Date;

  @Prop({ index: true })
  endDateTime: Date;

  // Reference to the venue
  @Prop({ type: Types.ObjectId, ref: 'Venue', required: true, index: true })
  venueId: Types.ObjectId;

  // Seating type for this event
  @Prop({ enum: ['SEATED', 'GENERAL_ADMISSION', 'MIXED'], default: 'SEATED' })
  seatingType: string;

  // Event status
  @Prop({ 
    enum: ['DRAFT', 'PUBLISHED', 'ON_SALE', 'SOLD_OUT', 'CANCELLED', 'COMPLETED'],
    default: 'DRAFT',
    index: true 
  })
  status: string;

  // Event category
  @Prop({ 
    enum: ['MUSIC', 'SPORTS', 'THEATER', 'COMEDY', 'OTHER'],
    index: true 
  })
  category: string;

  // Custom pricing per zone for this event (overrides venue defaults)
  @Prop({ type: Map, of: Number })
  zonePricing?: Map<string, number>; // { "Section A": 350, "Section B": 250, "Section D": 150 }

  @Prop()
  currency: string;

  // Seat hold/reservation timeout (in minutes)
  @Prop({ default: 10 })
  seatHoldTimeout: number;
}

export const EventSchema = SchemaFactory.createForClass(Event);
// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

// @Schema()
// class VenueInfo {
//   @Prop() name: string;
//   @Prop() city: string;
// }

// @Schema({ timestamps: true })
// export class Event {

//   @Prop({ required: true })
//   name: string;

//   @Prop()
//   description: string;

//   @Prop()
//   likes: number;

//   @Prop()
//   image : Blob;

//   @Prop()
//   dislikes: number;

//   @Prop({ index: true })
//   startDateTime: Date;

//   @Prop({ type: VenueInfo })
//   venue: VenueInfo;

//   @Prop()
//   seatingType: string;

//   @Prop({ index: true })
//   status: string;
// }

// export const EventSchema = SchemaFactory.createForClass(Event);
