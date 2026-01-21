import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
class VenueInfo {
  @Prop() name: string;
  @Prop() city: string;
}

@Schema({ timestamps: true })
export class Event {

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ index: true })
  startDateTime: Date;

  @Prop({ type: VenueInfo })
  venue: VenueInfo;

  @Prop()
  seatingType: string;

  @Prop({ index: true })
  status: string;
}

export const EventSchema = SchemaFactory.createForClass(Event);
