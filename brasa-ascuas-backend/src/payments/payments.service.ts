import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { Payment, PaymentDocument, PaymentStatus } from './schemas/payment.schema';
import { SessionsService } from '../sessions/sessions.service';
import { EventsGateway } from '../gateway/events.gateway';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

type StripeInstance = InstanceType<typeof Stripe>;

@Injectable()
export class PaymentsService {
  private readonly stripe: StripeInstance;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private configService: ConfigService,
    private sessionsService: SessionsService,
    private eventsGateway: EventsGateway,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2026-04-22.dahlia',
    });
  }

  async createPaymentIntent(dto: CreatePaymentIntentDto): Promise<PaymentDocument> {
    const session = await this.sessionsService.findById(dto.sessionId);
    const subtotal = session.totalAmount;
    const tip = dto.tip ?? 0;
    const total = Math.round((subtotal + tip) * 100) / 100;

    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'eur',
      metadata: {
        sessionId: dto.sessionId,
        tableId: session.table.toString(),
      },
      receipt_email: dto.receiptEmail,
    });

    const payment = new this.paymentModel({
      session: dto.sessionId,
      table: session.table,
      subtotal,
      tip,
      total,
      method: dto.method,
      status: PaymentStatus.PENDING,
      stripePaymentIntentId: intent.id,
      stripeClientSecret: intent.client_secret,
      receiptEmail: dto.receiptEmail,
    });

    return payment.save();
  }

  async handleWebhook(signature: string, payload: Buffer): Promise<void> {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Webhook signature inválida');
    }

    if (event.type === 'payment_intent.succeeded') {
      await this.onPaymentSucceeded(event.data.object.id as string);
    } else if (event.type === 'payment_intent.payment_failed') {
      await this.onPaymentFailed(event.data.object.id as string);
    }
  }

  private async onPaymentSucceeded(intentId: string): Promise<void> {
    const payment = await this.paymentModel.findOneAndUpdate(
      { stripePaymentIntentId: intentId },
      { status: PaymentStatus.SUCCEEDED, paidAt: new Date() },
      { new: true },
    );
    if (!payment) return;

    await this.sessionsService.markAsPaid(payment.session.toString());
    this.eventsGateway.emitPaymentConfirmed(payment.session.toString(), payment);
  }

  private async onPaymentFailed(intentId: string): Promise<void> {
    await this.paymentModel.findOneAndUpdate(
      { stripePaymentIntentId: intentId },
      { status: PaymentStatus.FAILED },
    );
  }

  /**
   * Simula un pago: crea registro succeeded sin Stripe, marca la sesión y emite WS.
   * Pensado para demo / TFG.
   */
  async simulate(dto: CreatePaymentIntentDto): Promise<PaymentDocument> {
    const session = await this.sessionsService.findById(dto.sessionId);
    if (!session.totalAmount || session.totalAmount <= 0) {
      throw new BadRequestException('No hay importe que cobrar en esta sesión');
    }

    const subtotal = session.totalAmount;
    const tip = dto.tip ?? 0;
    const total = Math.round((subtotal + tip) * 100) / 100;

    // Pequeño retardo para simular "procesando con el banco"
    await new Promise((r) => setTimeout(r, 1200));

    const payment = await new this.paymentModel({
      session: dto.sessionId,
      table: session.table,
      subtotal,
      tip,
      total,
      method: dto.method,
      status: PaymentStatus.SUCCEEDED,
      stripePaymentIntentId: `sim_${Date.now()}`,
      receiptEmail: dto.receiptEmail,
      paidAt: new Date(),
    }).save();

    await this.sessionsService.markAsPaid(dto.sessionId);
    this.eventsGateway.emitPaymentConfirmed(dto.sessionId, payment);
    return payment;
  }

  async findBySession(sessionId: string): Promise<PaymentDocument[]> {
    return this.paymentModel.find({ session: sessionId }).exec();
  }

  async findById(id: string): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findById(id).exec();
    if (!payment) throw new NotFoundException('Pago no encontrado');
    return payment;
  }
}
