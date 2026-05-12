import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Session, SessionDocument, SessionStatus } from './schemas/session.schema';
import { TablesService } from '../tables/tables.service';
import { TableStatus } from '../tables/schemas/table.schema';
import { CreateSessionDto } from './dto/create-session.dto';
import { BuffetService } from '../buffet/buffet.service';

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    private tablesService: TablesService,
    private buffetService: BuffetService,
  ) {}

  async create(dto: CreateSessionDto): Promise<SessionDocument> {
    const table = await this.tablesService.findById(dto.tableId);

    if (table.status !== TableStatus.FREE) {
      throw new BadRequestException('La mesa no está disponible');
    }

    const session = new this.sessionModel({
      table: dto.tableId,
      partySize: dto.partySize,
      token: uuidv4(),
      openedAt: new Date(),
    });

    await this.tablesService.updateStatus(dto.tableId, TableStatus.OCCUPIED);
    return session.save();
  }

  async findActiveByTableQr(qrCode: string): Promise<SessionDocument | null> {
    const table = await this.tablesService.findByQrCode(qrCode);
    return this.sessionModel
      .findOne({ table: table._id, status: SessionStatus.ACTIVE })
      .populate('table')
      .populate({ path: 'buffet', populate: { path: 'includedCategories' } })
      .exec();
  }

  async createFromQr(qrCode: string, partySize: number): Promise<SessionDocument> {
    const table = await this.tablesService.findByQrCode(qrCode);
    if (table.status !== TableStatus.FREE) {
      // Si está ocupada y tiene sesión activa, la devolvemos en vez de fallar
      const existing = await this.sessionModel
        .findOne({ table: table._id, status: SessionStatus.ACTIVE })
        .populate('table')
        .populate({ path: 'buffet', populate: { path: 'includedCategories' } })
        .exec();
      if (existing) return existing;
      throw new BadRequestException('La mesa no está disponible');
    }
    return this.create({ tableId: (table._id as Types.ObjectId).toString(), partySize });
  }

  async findByToken(token: string): Promise<SessionDocument> {
    const session = await this.sessionModel
      .findOne({ token, status: SessionStatus.ACTIVE })
      .populate('table')
      .populate({ path: 'buffet', populate: { path: 'includedCategories' } })
      .exec();
    if (!session) throw new NotFoundException('Sesión no encontrada o expirada');
    return session;
  }

  async findById(id: string): Promise<SessionDocument> {
    const session = await this.sessionModel
      .findById(id)
      .populate('table')
      .populate({ path: 'buffet', populate: { path: 'includedCategories' } })
      .exec();
    if (!session) throw new NotFoundException('Sesión no encontrada');
    return session;
  }

  async findActive(): Promise<SessionDocument[]> {
    return this.sessionModel
      .find({ status: SessionStatus.ACTIVE })
      .populate('table')
      .populate('buffet')
      .exec();
  }

  async chooseBuffet(id: string, buffetId: string): Promise<SessionDocument> {
    const buffet = await this.buffetService.findById(buffetId);
    const baseAmount = buffet.pricePerPerson;

    const current = await this.sessionModel.findById(id).exec();
    if (!current) throw new NotFoundException('Sesión no encontrada');
    if (current.buffet) {
      throw new BadRequestException('La sesión ya tiene un buffet seleccionado');
    }

    const initialTotal = baseAmount * current.partySize;
    current.buffet = buffet._id as Types.ObjectId;
    current.totalAmount = (current.totalAmount || 0) + initialTotal;
    await current.save();

    return this.findById(id);
  }

  async addAmount(id: string, amount: number): Promise<void> {
    await this.sessionModel.findByIdAndUpdate(id, {
      $inc: { totalAmount: amount, roundCount: 1 },
    });
  }

  async close(id: string): Promise<SessionDocument> {
    const session = await this.sessionModel.findById(id).exec();
    if (!session) throw new NotFoundException('Sesión no encontrada');

    session.status = SessionStatus.CLOSED;
    session.closedAt = new Date();
    await session.save();

    await this.tablesService.updateStatus(session.table.toString(), TableStatus.CLEANING);
    return session;
  }

  /** Demo/dev: cierra cualquier sesión activa de una mesa y la deja libre. */
  async resetTable(tableId: string): Promise<void> {
    await this.sessionModel.updateMany(
      { table: tableId, status: SessionStatus.ACTIVE },
      { status: SessionStatus.CLOSED, closedAt: new Date() },
    );
    await this.tablesService.forceFree(tableId);
  }

  async markAsPaid(id: string): Promise<SessionDocument> {
    const session = await this.sessionModel
      .findByIdAndUpdate(id, { status: SessionStatus.PAID, closedAt: new Date() }, { new: true })
      .exec();
    if (!session) throw new NotFoundException('Sesión no encontrada');
    // Libera la mesa para el siguiente cliente
    await this.tablesService.updateStatus(session.table.toString(), TableStatus.FREE);
    return session;
  }
}
