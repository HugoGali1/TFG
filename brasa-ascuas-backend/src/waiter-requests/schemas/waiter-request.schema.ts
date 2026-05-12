import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WaiterRequestDocument = WaiterRequest & Document;

export enum WaiterRequestType {
  CALL = 'call',
  WATER = 'water',
  CUTLERY = 'cutlery',
  BILL = 'bill',
  MENU_QUESTION = 'menu_question',
  OTHER = 'other',
}

export enum WaiterRequestStatus {
  PENDING = 'pending',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

@Schema({ timestamps: true })
export class WaiterRequest {
  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  session: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Table', required: true })
  table: Types.ObjectId;

  @Prop({ type: String, enum: WaiterRequestType, required: true })
  type: WaiterRequestType;

  @Prop({ trim: true })
  message: string;

  @Prop({ type: String, enum: WaiterRequestStatus, default: WaiterRequestStatus.PENDING })
  status: WaiterRequestStatus;

  @Prop()
  resolvedAt: Date;
}

export const WaiterRequestSchema = SchemaFactory.createForClass(WaiterRequest);
