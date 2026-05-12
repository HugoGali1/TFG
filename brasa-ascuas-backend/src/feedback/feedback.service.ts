import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Feedback, FeedbackDocument } from './schemas/feedback.schema';
import { SessionsService } from '../sessions/sessions.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name) private feedbackModel: Model<FeedbackDocument>,
    private sessionsService: SessionsService,
  ) {}

  async create(dto: CreateFeedbackDto): Promise<FeedbackDocument> {
    const session = await this.sessionsService.findById(dto.sessionId);
    const feedback = new this.feedbackModel({
      session: dto.sessionId,
      table: session.table,
      rating: dto.rating,
      comment: dto.comment,
    });
    return feedback.save();
  }

  async findAll(): Promise<FeedbackDocument[]> {
    return this.feedbackModel.find().populate('table').sort({ createdAt: -1 }).exec();
  }

  async getStats(): Promise<{ averageRating: number; total: number }> {
    const result = await this.feedbackModel.aggregate([
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (!result.length) return { averageRating: 0, total: 0 };
    return {
      averageRating: Math.round(result[0].avg * 10) / 10,
      total: result[0].count,
    };
  }
}
