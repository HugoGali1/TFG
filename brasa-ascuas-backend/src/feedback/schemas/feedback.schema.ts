import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FeedbackDocument = Feedback & Document;

@Schema({ timestamps: true })
export class Feedback {
  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  session: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Table', required: true })
  table: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ trim: true })
  comment: string;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
