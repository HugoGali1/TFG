import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BuffetDocument = Buffet & Document;

@Schema({ timestamps: true })
export class Buffet {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  nameEn: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ trim: true })
  descriptionEn: string;

  @Prop({ required: true, min: 0 })
  pricePerPerson: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }], default: [] })
  includedCategories: Types.ObjectId[];

  @Prop()
  icon: string;

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const BuffetSchema = SchemaFactory.createForClass(Buffet);
