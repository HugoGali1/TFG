import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TableDocument = Table & Document;

export enum TableZone {
  INTERIOR = 'interior',
  TERRAZA = 'terraza',
  BARRA = 'barra',
  PRIVADO = 'privado',
}

export enum TableStatus {
  FREE = 'free',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  CLEANING = 'cleaning',
}

@Schema({ timestamps: true })
export class Table {
  @Prop({ required: true, unique: true })
  number: number;

  @Prop({ type: String, enum: TableZone, default: TableZone.INTERIOR })
  zone: TableZone;

  @Prop({ required: true, min: 1 })
  capacity: number;

  @Prop({ type: String, enum: TableStatus, default: TableStatus.FREE })
  status: TableStatus;

  @Prop({ unique: true })
  qrCode: string;
}

export const TableSchema = SchemaFactory.createForClass(Table);
