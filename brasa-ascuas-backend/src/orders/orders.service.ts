import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { OrderStatus } from './enums/order-status.enum';
import { SessionsService } from '../sessions/sessions.service';
import { MenuService } from '../menu/menu.service';
import { EventsGateway } from '../gateway/events.gateway';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private sessionsService: SessionsService,
    private menuService: MenuService,
    private eventsGateway: EventsGateway,
  ) {}

  async create(dto: CreateOrderDto): Promise<OrderDocument> {
    const session = await this.sessionsService.findById(dto.sessionId);

    // categorías cubiertas por el buffet (si hay)
    const coveredCategoryIds = new Set<string>();
    const buffet: any = (session as any).buffet;
    if (buffet?.includedCategories) {
      for (const c of buffet.includedCategories) {
        coveredCategoryIds.add((c._id ?? c).toString());
      }
    }

    let extrasTotal = 0;
    const resolvedItems = await Promise.all(
      dto.items.map(async (item) => {
        const menuItem = await this.menuService.findItemById(item.menuItemId);
        if (!menuItem.isAvailable) {
          throw new BadRequestException(`"${menuItem.name}" no está disponible`);
        }
        const categoryId = ((menuItem.category as any)?._id ?? menuItem.category).toString();
        const isCovered = coveredCategoryIds.has(categoryId);
        const linePrice = isCovered ? 0 : menuItem.price * item.quantity;
        extrasTotal += linePrice;
        return {
          menuItem: menuItem._id,
          name: menuItem.name,
          quantity: item.quantity,
          cookingLevel: item.cookingLevel,
          notes: item.notes,
          status: OrderStatus.RECEIVED,
          estimatedMinutes: menuItem.cookingTimeMinutes,
          unitPrice: menuItem.price,
          linePrice,
          coveredByBuffet: isCovered,
        };
      }),
    );

    const total = Math.round(extrasTotal * 100) / 100;
    const roundNumber = (session.roundCount || 0) + 1;

    const order = new this.orderModel({
      session: dto.sessionId,
      table: session.table,
      roundNumber,
      items: resolvedItems,
      generalNotes: dto.generalNotes,
      totalAmount: total,
      sentAt: new Date(),
    });

    const saved = await order.save();
    await this.sessionsService.addAmount(dto.sessionId, total);

    const populated = await this.orderModel
      .findById(saved._id)
      .populate('table')
      .populate({ path: 'items.menuItem', populate: { path: 'category' } })
      .exec();

    this.eventsGateway.emitNewOrder(populated ?? saved);
    return populated ?? saved;
  }

async findBySession(sessionId: string): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ session: sessionId })
      .populate({ path: 'items.menuItem', populate: { path: 'category' } })
      .sort({ createdAt: 1 })
      .exec();
  }

  async findActive(): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ status: { $in: [OrderStatus.RECEIVED, OrderStatus.COOKING] } })
      .populate('session')
      .populate('table')
      .populate({ path: 'items.menuItem', populate: { path: 'category' } })
      .sort({ sentAt: 1 })
      .exec();
  }

  async findById(id: string): Promise<OrderDocument> {
    const order = await this.orderModel
      .findById(id)
      .populate({ path: 'items.menuItem', populate: { path: 'category' } })
      .exec();
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<OrderDocument> {
    const order = await this.orderModel
      .findByIdAndUpdate(
        id,
        { status, ...(status === OrderStatus.SERVED ? { servedAt: new Date() } : {}) },
        { new: true },
      )
      .exec();
    if (!order) throw new NotFoundException('Pedido no encontrado');

    this.eventsGateway.emitOrderStatusUpdate(order);
    return order;
  }

  async updateItemStatus(
    orderId: string,
    itemIndex: number,
    status: OrderStatus,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (!order.items[itemIndex]) throw new BadRequestException('Índice de item inválido');

    order.items[itemIndex].status = status;

    const allServed = order.items.every((i) => i.status === OrderStatus.SERVED);
    if (allServed) order.status = OrderStatus.SERVED;

    const anyCooking = order.items.some((i) => i.status === OrderStatus.COOKING);
    if (anyCooking && order.status === OrderStatus.RECEIVED) {
      order.status = OrderStatus.COOKING;
    }

    await order.save();
    this.eventsGateway.emitOrderStatusUpdate(order);
    return order;
  }
}
