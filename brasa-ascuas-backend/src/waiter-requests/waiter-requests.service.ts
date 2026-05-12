import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  WaiterRequest,
  WaiterRequestDocument,
  WaiterRequestStatus,
} from './schemas/waiter-request.schema';
import { SessionsService } from '../sessions/sessions.service';
import { EventsGateway } from '../gateway/events.gateway';
import { CreateWaiterRequestDto } from './dto/create-waiter-request.dto';

@Injectable()
export class WaiterRequestsService {
  constructor(
    @InjectModel(WaiterRequest.name) private requestModel: Model<WaiterRequestDocument>,
    private sessionsService: SessionsService,
    private eventsGateway: EventsGateway,
  ) {}

  async create(dto: CreateWaiterRequestDto): Promise<WaiterRequestDocument> {
    const session = await this.sessionsService.findById(dto.sessionId);
    const request = new this.requestModel({
      session: dto.sessionId,
      table: session.table,
      type: dto.type,
      message: dto.message,
    });
    const saved = await request.save();
    this.eventsGateway.emitWaiterRequest(saved);
    return saved;
  }

  async findPending(): Promise<WaiterRequestDocument[]> {
    return this.requestModel
      .find({ status: WaiterRequestStatus.PENDING })
      .populate('table')
      .sort({ createdAt: 1 })
      .exec();
  }

  async acknowledge(id: string): Promise<WaiterRequestDocument> {
    const req = await this.requestModel
      .findByIdAndUpdate(id, { status: WaiterRequestStatus.ACKNOWLEDGED }, { new: true })
      .exec();
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    return req;
  }

  async resolve(id: string): Promise<WaiterRequestDocument> {
    const req = await this.requestModel
      .findByIdAndUpdate(
        id,
        { status: WaiterRequestStatus.RESOLVED, resolvedAt: new Date() },
        { new: true },
      )
      .exec();
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    return req;
  }
}
