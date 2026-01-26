import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  ADMIN = 'ADMIN',
  TICKETING = 'TICKETING',
  GATE = 'GATE',
  MANAGEMENT = 'MANAGEMENT',
  CUSTOMER = 'CUSTOMER',
}

@Schema()
class AuthDetails {
  @Prop({ required: true })
  passwordHash: string;

  @Prop({ default: false })
  mfaEnabled: boolean;
}

const AuthDetailsSchema = SchemaFactory.createForClass(AuthDetails);

@Schema({ timestamps: true })
export class User {

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ type: String, enum: UserRole, index: true })
  role: UserRole;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ type: AuthDetailsSchema, required: true })
  auth: AuthDetails;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLoginAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
