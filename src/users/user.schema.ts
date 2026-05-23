import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: null })
  avatar: string;

  @Prop({ default: null })
  avatarPublicId: string;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop({ default: null })
  lastSeen: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
