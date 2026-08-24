import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import {
  Payment,
  PaymentDocument,
  PaymentMethod,
  PaymentStatus,
} from './schemas/payment.schema';
import { SessionsService } from '../sessions/sessions.service';
import { EventsGateway } from '../gateway/events.gateway';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

type StripeInstance = InstanceType<typeof Stripe>;

// A partir de stripe@22 los tipos de recurso dejaron de colgar del export por
// defecto (`Stripe.Event` ya no resuelve) y el `exports` map del paquete impide
// importarlos por ruta profunda, así que los derivamos de la propia instancia.
type StripeEvent = ReturnType<StripeInstance['webhooks']['constructEvent']>;
type StripePaymentIntent = Awaited<ReturnType<StripeInstance['paymentIntents']['retrieve']>>;

/** Importe mínimo que acepta Stripe en euros (50 céntimos). */
const MIN_CHARGE_EUR = 0.5;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: StripeInstance | null;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private configService: ConfigService,
    private sessionsService: SessionsService,
    private eventsGateway: EventsGateway,
  ) {
    const key = this.configService.get<string>('STRIPE_SECRET_KEY');

    // Sin clave (o con el placeholder de .env.example) el módulo sigue
    // arrancando: la app funciona con /payments/simulate y solo fallan
    // los endpoints que necesitan Stripe de verdad.
    if (!key || key.startsWith('sk_test_your')) {
      this.stripe = null;
      this.logger.warn(
        'STRIPE_SECRET_KEY no configurada — pagos reales deshabilitados, usa /payments/simulate',
      );
    } else {
      this.stripe = new Stripe(key, { apiVersion: '2026-04-22.dahlia' });
    }
  }

  get isStripeEnabled(): boolean {
    return this.stripe !== null;
  }

  private requireStripe(): StripeInstance {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Stripe no está configurado en el servidor (falta STRIPE_SECRET_KEY)',
      );
    }
    return this.stripe;
  }

  /** Calcula subtotal / propina / total a partir de la sesión, validando el importe. */
  private async quote(dto: CreatePaymentIntentDto) {
    const session = await this.sessionsService.findById(dto.sessionId);
    const subtotal = session.totalAmount;

    if (!subtotal || subtotal <= 0) {
      throw new BadRequestException('No hay importe que cobrar en esta sesión');
    }

    const tip = dto.tip ?? 0;
    const total = Math.round((subtotal + tip) * 100) / 100;

    if (total < MIN_CHARGE_EUR) {
      throw new BadRequestException(
        `El importe mínimo para cobrar con tarjeta es ${MIN_CHARGE_EUR.toFixed(2)} EUR`,
      );
    }

    return { session, subtotal, tip, total };
  }

  /**
   * Crea (o reutiliza) el PaymentIntent de la sesión y devuelve el pago pendiente
   * con su client_secret, que el front necesita para confirmar con Stripe.js.
   *
   * Se reutiliza el intent mientras siga siendo actualizable, porque el cliente
   * puede cambiar la propina varias veces antes de pagar y no queremos dejar un
   * reguero de intents huérfanos en el dashboard.
   */
  async createPaymentIntent(dto: CreatePaymentIntentDto): Promise<PaymentDocument> {
    const stripe = this.requireStripe();
    const { session, subtotal, tip, total } = await this.quote(dto);
    const amountInCents = Math.round(total * 100);

    const existing = await this.paymentModel
      .findOne({
        session: dto.sessionId,
        status: { $in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        stripePaymentIntentId: { $regex: '^pi_' },
      })
      .exec();

    if (existing) {
      const reused = await this.tryUpdateIntent(stripe, existing, {
        amountInCents,
        subtotal,
        tip,
        total,
        receiptEmail: dto.receiptEmail,
      });
      if (reused) return reused;
    }

    const intent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      // Deja que Stripe ofrezca los métodos activados en el dashboard
      // (tarjeta, Apple/Google Pay, Bizum...) en lugar de fijarlos aquí.
      automatic_payment_methods: { enabled: true },
      metadata: {
        sessionId: dto.sessionId,
        tableId: session.table.toString(),
      },
      ...(dto.receiptEmail ? { receipt_email: dto.receiptEmail } : {}),
    });

    return new this.paymentModel({
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
    }).save();
  }

  /**
   * Intenta actualizar un intent ya existente. Devuelve null si Stripe lo
   * rechaza (por ejemplo si ya está en curso o cancelado), para que el llamante
   * cree uno nuevo.
   */
  private async tryUpdateIntent(
    stripe: StripeInstance,
    payment: PaymentDocument,
    data: {
      amountInCents: number;
      subtotal: number;
      tip: number;
      total: number;
      receiptEmail?: string;
    },
  ): Promise<PaymentDocument | null> {
    try {
      const intent = await stripe.paymentIntents.update(payment.stripePaymentIntentId, {
        amount: data.amountInCents,
        ...(data.receiptEmail ? { receipt_email: data.receiptEmail } : {}),
      });

      payment.subtotal = data.subtotal;
      payment.tip = data.tip;
      payment.total = data.total;
      payment.stripeClientSecret = intent.client_secret ?? payment.stripeClientSecret;
      if (data.receiptEmail) payment.receiptEmail = data.receiptEmail;
      return await payment.save();
    } catch (err) {
      this.logger.warn(
        `No se pudo reutilizar el intent ${payment.stripePaymentIntentId}, se creará otro: ${
          (err as Error).message
        }`,
      );
      await this.paymentModel
        .updateOne({ _id: payment._id }, { status: PaymentStatus.FAILED })
        .exec();
      return null;
    }
  }

  /** Verifica la firma del webhook y aplica el cambio de estado correspondiente. */
  async handleWebhook(signature: string, payload: Buffer): Promise<{ received: boolean }> {
    const stripe = this.requireStripe();
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret || webhookSecret.startsWith('whsec_your')) {
      throw new ServiceUnavailableException('STRIPE_WEBHOOK_SECRET no está configurado');
    }
    if (!signature || !payload) {
      throw new BadRequestException('Falta la firma o el cuerpo del webhook');
    }

    let event: StripeEvent;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      this.logger.warn(`Firma de webhook inválida: ${(err as Error).message}`);
      throw new BadRequestException('Webhook signature inválida');
    }

    const intent = event.data.object as StripePaymentIntent;

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.markSucceeded(intent.id);
        break;
      case 'payment_intent.processing':
        // Métodos asíncronos como Bizum pasan por aquí antes de confirmarse.
        await this.setStatus(intent.id, PaymentStatus.PROCESSING);
        break;
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled':
        await this.setStatus(intent.id, PaymentStatus.FAILED);
        break;
      default:
        this.logger.debug(`Evento de Stripe ignorado: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Reconcilia un pago consultando su estado directamente a Stripe.
   *
   * El webhook es la fuente de verdad en producción, pero en local (sin
   * `stripe listen`) nunca llega: el front llama aquí tras confirmar para que
   * la sesión se cierre igualmente. Es idempotente, así que da igual que
   * después llegue también el webhook.
   */
  async syncFromStripe(paymentId: string): Promise<PaymentDocument> {
    const stripe = this.requireStripe();
    const payment = await this.findById(paymentId);

    if (payment.status === PaymentStatus.SUCCEEDED) return payment;

    const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId, {
      // Se expande para saber con qué se pagó realmente (tarjeta, wallet, Bizum).
      expand: ['latest_charge'],
    });

    if (intent.status === 'succeeded') {
      return (await this.markSucceeded(intent.id, this.methodFrom(intent))) ?? this.findById(paymentId);
    }
    if (intent.status === 'processing') {
      return (await this.setStatus(intent.id, PaymentStatus.PROCESSING)) ?? payment;
    }
    if (intent.status === 'canceled') {
      return (await this.setStatus(intent.id, PaymentStatus.FAILED)) ?? payment;
    }
    return payment;
  }

  /**
   * Traduce el método que Stripe registró en el cargo al enum interno.
   * Devuelve undefined si no hay equivalencia (no todos los métodos de Stripe
   * están contemplados en la app).
   */
  private methodFrom(intent: StripePaymentIntent): PaymentMethod | undefined {
    const charge = intent.latest_charge;
    if (!charge || typeof charge === 'string') return undefined;

    const details = charge.payment_method_details;
    if (!details) return undefined;

    if (details.type === 'bizum') return PaymentMethod.BIZUM;
    if (details.type === 'card') {
      const wallet = details.card?.wallet?.type;
      if (wallet === 'apple_pay') return PaymentMethod.APPLE_PAY;
      if (wallet === 'google_pay') return PaymentMethod.GOOGLE_PAY;
      return PaymentMethod.CARD;
    }
    return undefined;
  }

  /** Marca el pago como cobrado, cierra la sesión y avisa por WebSocket. */
  private async markSucceeded(
    intentId: string,
    method?: PaymentMethod,
  ): Promise<PaymentDocument | null> {
    const payment = await this.paymentModel
      .findOneAndUpdate(
        { stripePaymentIntentId: intentId, status: { $ne: PaymentStatus.SUCCEEDED } },
        {
          status: PaymentStatus.SUCCEEDED,
          paidAt: new Date(),
          ...(method ? { method } : {}),
        },
        { new: true },
      )
      .exec();

    // Sin documento: o ya estaba en succeeded (el webhook se nos adelantó al
    // sync, o al revés) o el intent no es nuestro. En ambos casos, nada que hacer.
    if (!payment) return null;

    await this.sessionsService.markAsPaid(payment.session.toString());
    this.eventsGateway.emitPaymentConfirmed(payment.session.toString(), payment);
    return payment;
  }

  private async setStatus(
    intentId: string,
    status: PaymentStatus,
  ): Promise<PaymentDocument | null> {
    return this.paymentModel
      .findOneAndUpdate(
        { stripePaymentIntentId: intentId, status: { $ne: PaymentStatus.SUCCEEDED } },
        { status },
        { new: true },
      )
      .exec();
  }

  /**
   * Simula un pago: crea registro succeeded sin Stripe, marca la sesión y emite WS.
   * Pensado para demo / TFG.
   */
  async simulate(dto: CreatePaymentIntentDto): Promise<PaymentDocument> {
    const { session, subtotal, tip, total } = await this.quote(dto);

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
