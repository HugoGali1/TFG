import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MenuItemDocument = MenuItem & Document;

@Schema({ timestamps: true })
export class MenuItem {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  nameEn: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ trim: true })
  descriptionEn: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ min: 0, default: 0 })
  cookingTimeMinutes: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [String], default: [] })
  allergens: string[];

  @Prop({ default: false })
  isVegetarian: boolean;

  @Prop({ default: false })
  isGlutenFree: boolean;

  @Prop({ default: false })
  isSpicy: boolean;

  @Prop({ default: false })
  isGrilled: boolean;

  @Prop()
  imageUrl: string;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ default: 0 })
  orderCount: number;

  @Prop({
    type: [String],
    enum: ['poco', 'medio', 'al_punto', 'hecho'],
    default: [],
  })
  cookingLevels: string[];
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);
