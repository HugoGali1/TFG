import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SessionDocument = Session & Document;

export enum SessionStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  PAID = 'paid',
}

@Schema({ timestamps: true })
export class Session {
  @Prop({ type: Types.ObjectId, ref: 'Table', required: true })
  table: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Buffet' })
  buffet: Types.ObjectId;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true, min: 1 })
  partySize: number;

  @Prop({ type: String, enum: SessionStatus, default: SessionStatus.ACTIVE })
  status: SessionStatus;

  @Prop({ default: 0 })
  totalAmount: number;

  @Prop({ default: 0 })
  roundCount: number;

  @Prop()
  openedAt: Date;

  @Prop()
  closedAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
