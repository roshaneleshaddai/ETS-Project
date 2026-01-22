import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EventDocument = Event & Document;
  export enum eventType
  {
    All='All',
    Music='Music',
    Sports='Sports',
    Cinema='Cinema',
    Comedy='Comedy',    
  }
@Schema({ timestamps: true })
export class Event {

  @Prop({ required: true })
  startDateTime!: Date;

@Prop({type:String,enum:'eventType'})
Type!:eventType;


  @Prop({ type: Buffer, required: true })
  image!: Buffer;

  @Prop({ type: { name: String, city: String }, _id: false })
  venue!: { name: string; city: string };

  @Prop()
  seatingType!: string;

  @Prop()
  status!: string;
}
export const EventSchema = SchemaFactory.createForClass(Event);
