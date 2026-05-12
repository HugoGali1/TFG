import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Table, TableDocument, TableStatus } from './schemas/table.schema';
import { CreateTableDto } from './dto/create-table.dto';

@Injectable()
export class TablesService {
  constructor(@InjectModel(Table.name) private tableModel: Model<TableDocument>) {}

  async create(dto: CreateTableDto): Promise<TableDocument> {
    const existing = await this.tableModel.findOne({ number: dto.number });
    if (existing) throw new ConflictException(`La mesa ${dto.number} ya existe`);

    const table = new this.tableModel({ ...dto, qrCode: uuidv4() });
    return table.save();
  }

  async findAll(): Promise<TableDocument[]> {
    return this.tableModel.find().sort({ number: 1 }).exec();
  }

  async findById(id: string): Promise<TableDocument> {
    const table = await this.tableModel.findById(id).exec();
    if (!table) throw new NotFoundException('Mesa no encontrada');
    return table;
  }

  async findByQrCode(qrCode: string): Promise<TableDocument> {
    const table = await this.tableModel.findOne({ qrCode }).exec();
    if (!table) throw new NotFoundException('QR inválido');
    return table;
  }

  async updateStatus(id: string, status: TableStatus): Promise<TableDocument> {
    const table = await this.tableModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
    if (!table) throw new NotFoundException('Mesa no encontrada');
    return table;
  }

  async forceFree(id: string): Promise<TableDocument> {
    const table = await this.tableModel
      .findByIdAndUpdate(id, { status: TableStatus.FREE }, { new: true })
      .exec();
    if (!table) throw new NotFoundException('Mesa no encontrada');
    return table;
  }

  async regenerateQr(id: string): Promise<TableDocument> {
    const table = await this.tableModel
      .findByIdAndUpdate(id, { qrCode: uuidv4() }, { new: true })
      .exec();
    if (!table) throw new NotFoundException('Mesa no encontrada');
    return table;
  }

  async remove(id: string): Promise<void> {
    const result = await this.tableModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Mesa no encontrada');
  }
}
