import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrderStatus } from '../enums/order-status.enum';

export type OrderDocument = Order & Document;

export class OrderItem {
  menuItem: Types.ObjectId;
  name: string;
  quantity: number;
  cookingLevel?: string;
  notes?: string;
  status: OrderStatus;
  estimatedMinutes?: number;
  unitPrice: number;
  linePrice: number;
  coveredByBuffet: boolean;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  session: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Table', required: true })
  table: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  roundNumber: number;

  @Prop({
    type: [
      {
        menuItem: { type: Types.ObjectId, ref: 'MenuItem' },
        name: String,
        quantity: { type: Number, min: 1 },
        cookingLevel: String,
        notes: String,
        status: { type: String, enum: OrderStatus, default: OrderStatus.RECEIVED },
        estimatedMinutes: Number,
        unitPrice: { type: Number, default: 0 },
        linePrice: { type: Number, default: 0 },
        coveredByBuffet: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  items: OrderItem[];

  @Prop()
  generalNotes: string;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.RECEIVED })
  status: OrderStatus;

  @Prop({ default: 0 })
  totalAmount: number;

  @Prop()
  sentAt: Date;

  @Prop()
  servedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
