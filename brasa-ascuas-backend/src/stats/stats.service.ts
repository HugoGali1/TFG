import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Session, SessionDocument } from '../sessions/schemas/session.schema';
import { Table, TableDocument, TableStatus } from '../tables/schemas/table.schema';
import { Feedback, FeedbackDocument } from '../feedback/schemas/feedback.schema';

export interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  activeTables: number;
  avgRating: number;
  totalRatings: number;
  topItems: { name: string; quantity: number }[];
  topBuffets: { name: string; icon?: string; sessions: number; revenue: number }[];
  recentRatings: { rating: number; comment?: string; createdAt: Date }[];
}

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
    @InjectModel(Feedback.name) private feedbackModel: Model<FeedbackDocument>,
  ) {}

  async getDashboard(): Promise<DashboardStats> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      todayOrders,
      todayRevenueRes,
      activeTables,
      ratingsAgg,
      topItems,
      topBuffets,
      recentRatings,
    ] = await Promise.all([
      this.orderModel.countDocuments({ createdAt: { $gte: todayStart } }),
      this.sessionModel.aggregate<{ _id: null; total: number }>([
        { $match: { status: 'paid', closedAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      this.tableModel.countDocuments({ status: TableStatus.OCCUPIED }),
      this.feedbackModel.aggregate<{ _id: null; avg: number; count: number }>([
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
      this.orderModel.aggregate<{ name: string; quantity: number }>([
        { $unwind: '$items' },
        { $group: { _id: '$items.name', quantity: { $sum: '$items.quantity' } } },
        { $sort: { quantity: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, name: '$_id', quantity: 1 } },
      ]),
      this.sessionModel.aggregate<{ name: string; icon?: string; sessions: number; revenue: number }>([
        { $match: { buffet: { $ne: null } } },
        { $group: { _id: '$buffet', sessions: { $sum: 1 }, totalRevenue: { $sum: '$totalAmount' } } },
        { $sort: { sessions: -1 } },
        { $lookup: { from: 'buffets', localField: '_id', foreignField: '_id', as: 'buffetInfo' } },
        { $unwind: '$buffetInfo' },
        { $project: { _id: 0, name: '$buffetInfo.name', icon: '$buffetInfo.icon', sessions: 1, revenue: '$totalRevenue' } },
      ]),
      this.feedbackModel
        .find({}, { rating: 1, comment: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
        .exec(),
    ]);

    return {
      todayOrders,
      todayRevenue: Math.round((todayRevenueRes[0]?.total ?? 0) * 100) / 100,
      activeTables,
      avgRating: Math.round((ratingsAgg[0]?.avg ?? 0) * 10) / 10,
      totalRatings: ratingsAgg[0]?.count ?? 0,
      topItems,
      topBuffets: topBuffets.map((b) => ({ ...b, revenue: Math.round(b.revenue * 100) / 100 })),
      recentRatings: recentRatings as unknown as DashboardStats['recentRatings'],
    };
  }
}
