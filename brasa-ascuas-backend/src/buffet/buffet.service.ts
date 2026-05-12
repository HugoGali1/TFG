import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Buffet, BuffetDocument } from './schemas/buffet.schema';
import { CreateBuffetDto } from './dto/create-buffet.dto';

@Injectable()
export class BuffetService {
  constructor(@InjectModel(Buffet.name) private buffetModel: Model<BuffetDocument>) {}

  async create(dto: CreateBuffetDto): Promise<BuffetDocument> {
    return new this.buffetModel(dto).save();
  }

  async findAll(): Promise<BuffetDocument[]> {
    return this.buffetModel
      .find({ isActive: true })
      .populate('includedCategories')
      .sort({ order: 1, pricePerPerson: 1 })
      .exec();
  }

  async findById(id: string): Promise<BuffetDocument> {
    const b = await this.buffetModel.findById(id).populate('includedCategories').exec();
    if (!b) throw new NotFoundException('Buffet no encontrado');
    return b;
  }

  async update(id: string, dto: Partial<CreateBuffetDto>): Promise<BuffetDocument> {
    const b = await this.buffetModel
      .findByIdAndUpdate(id, dto, { new: true })
      .populate('includedCategories')
      .exec();
    if (!b) throw new NotFoundException('Buffet no encontrado');
    return b;
  }
}
