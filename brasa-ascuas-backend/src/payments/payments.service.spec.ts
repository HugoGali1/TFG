import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Payment, PaymentMethod, PaymentStatus } from './schemas/payment.schema';
import { SessionsService } from '../sessions/sessions.service';
import { EventsGateway } from '../gateway/events.gateway';
import { ConfigService } from '@nestjs/config';

// Mock del SDK de Stripe: el constructor devuelve siempre el mismo objeto,
// accesible desde los tests a través de `__mock`.
jest.mock('stripe', () => {
  const instance = {
    paymentIntents: {
      create: jest.fn(),
      update: jest.fn(),
      retrieve: jest.fn(),
    },
    webhooks: { constructEvent: jest.fn() },
  };
  const ctor: any = jest.fn(() => instance);
  ctor.__mock = instance;
  return ctor;
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const stripeMock = (require('stripe') as any).__mock;

describe('PaymentsService', () => {
  let capturedPaymentData: any;

  const sessionsService = { findById: jest.fn(), markAsPaid: jest.fn() };
  const eventsGateway = { emitPaymentConfirmed: jest.fn() };

  // Mock del constructor de Mongoose, igual que en orders.service.spec.
  const paymentModelMock: any = jest.fn().mockImplementation(function (this: any, data: any) {
    capturedPaymentData = data;
    this.save = jest.fn().mockResolvedValue({ ...data, _id: 'pay_1' });
    return this;
  });

  /** Construye el servicio con las claves indicadas en el entorno. */
  async function build(env: Record<string, string | undefined>): Promise<PaymentsService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getModelToken(Payment.name), useValue: paymentModelMock },
        { provide: ConfigService, useValue: { get: (k: string) => env[k] } },
        { provide: SessionsService, useValue: sessionsService },
        { provide: EventsGateway, useValue: eventsGateway },
      ],
    }).compile();
    return module.get<PaymentsService>(PaymentsService);
  }

  const withStripe = {
    STRIPE_SECRET_KEY: 'sk_test_realkey',
    STRIPE_WEBHOOK_SECRET: 'whsec_realsecret',
  };

  beforeEach(() => {
    capturedPaymentData = null;
    jest.clearAllMocks();
    paymentModelMock.findOne = jest.fn(() => ({ exec: jest.fn().mockResolvedValue(null) }));
    paymentModelMock.findOneAndUpdate = jest.fn(() => ({ exec: jest.fn().mockResolvedValue(null) }));
    paymentModelMock.updateOne = jest.fn(() => ({ exec: jest.fn().mockResolvedValue({}) }));
    paymentModelMock.findById = jest.fn(() => ({ exec: jest.fn().mockResolvedValue(null) }));
    sessionsService.findById.mockResolvedValue({ totalAmount: 40, table: 'table_1' });
  });

  describe('sin Stripe configurado', () => {
    it('se degrada en vez de romper el arranque cuando la clave es el placeholder', async () => {
      const service = await build({ STRIPE_SECRET_KEY: 'sk_test_your_stripe_secret_key' });
      expect(service.isStripeEnabled).toBe(false);
    });

    it('rechaza crear un intent, pero deja funcionar la simulación', async () => {
      const service = await build({});
      expect(service.isStripeEnabled).toBe(false);

      await expect(service.createPaymentIntent({ sessionId: 's1' } as any)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );

      const payment = await service.simulate({ sessionId: 's1', tip: 4 } as any);
      expect(payment.total).toBe(44);
      expect(sessionsService.markAsPaid).toHaveBeenCalledWith('s1');
      expect(eventsGateway.emitPaymentConfirmed).toHaveBeenCalled();
    });
  });

  describe('createPaymentIntent', () => {
    it('crea el intent en céntimos, en euros y con métodos automáticos', async () => {
      const service = await build(withStripe);
      stripeMock.paymentIntents.create.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'pi_123_secret',
      });

      await service.createPaymentIntent({ sessionId: 's1', tip: 4.2 } as any);

      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 4420, // (40 + 4.20) € → céntimos
          currency: 'eur',
          automatic_payment_methods: { enabled: true },
          metadata: { sessionId: 's1', tableId: 'table_1' },
        }),
      );
      // Sin email no se manda receipt_email vacío a Stripe.
      expect(stripeMock.paymentIntents.create.mock.calls[0][0]).not.toHaveProperty('receipt_email');
      expect(capturedPaymentData.status).toBe(PaymentStatus.PENDING);
      expect(capturedPaymentData.stripeClientSecret).toBe('pi_123_secret');
    });

    it('rechaza importes por debajo del mínimo de Stripe', async () => {
      const service = await build(withStripe);
      sessionsService.findById.mockResolvedValue({ totalAmount: 0.3, table: 'table_1' });

      await expect(
        service.createPaymentIntent({ sessionId: 's1' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('rechaza cobrar una sesión sin importe', async () => {
      const service = await build(withStripe);
      sessionsService.findById.mockResolvedValue({ totalAmount: 0, table: 'table_1' });

      await expect(
        service.createPaymentIntent({ sessionId: 's1' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reutiliza el intent pendiente al cambiar la propina, en vez de crear otro', async () => {
      const service = await build(withStripe);
      const existing: any = {
        _id: 'pay_1',
        stripePaymentIntentId: 'pi_123',
        stripeClientSecret: 'pi_123_secret',
        save: jest.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };
      paymentModelMock.findOne = jest.fn(() => ({ exec: jest.fn().mockResolvedValue(existing) }));
      stripeMock.paymentIntents.update.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'pi_123_secret_v2',
      });

      const result = await service.createPaymentIntent({ sessionId: 's1', tip: 6 } as any);

      expect(stripeMock.paymentIntents.update).toHaveBeenCalledWith(
        'pi_123',
        expect.objectContaining({ amount: 4600 }),
      );
      expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
      expect(result.total).toBe(46);
      expect(result.stripeClientSecret).toBe('pi_123_secret_v2');
    });

    it('crea un intent nuevo si Stripe rechaza actualizar el anterior', async () => {
      const service = await build(withStripe);
      paymentModelMock.findOne = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({ _id: 'pay_1', stripePaymentIntentId: 'pi_old' }),
      }));
      stripeMock.paymentIntents.update.mockRejectedValue(new Error('intent ya confirmado'));
      stripeMock.paymentIntents.create.mockResolvedValue({
        id: 'pi_new',
        client_secret: 'pi_new_secret',
      });

      await service.createPaymentIntent({ sessionId: 's1' } as any);

      expect(stripeMock.paymentIntents.create).toHaveBeenCalled();
      expect(capturedPaymentData.stripePaymentIntentId).toBe('pi_new');
    });
  });

  describe('handleWebhook', () => {
    it('marca pagado, cierra la sesión y avisa por WebSocket', async () => {
      const service = await build(withStripe);
      stripeMock.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      });
      const saved = { session: 'sess_1', total: 44 };
      paymentModelMock.findOneAndUpdate = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue(saved),
      }));

      const result = await service.handleWebhook('sig', Buffer.from('{}'));

      expect(result).toEqual({ received: true });
      expect(sessionsService.markAsPaid).toHaveBeenCalledWith('sess_1');
      expect(eventsGateway.emitPaymentConfirmed).toHaveBeenCalledWith('sess_1', saved);
    });

    it('es idempotente: un segundo evento succeeded no vuelve a cerrar la sesión', async () => {
      const service = await build(withStripe);
      stripeMock.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      });
      // El filtro `status != succeeded` ya no encuentra nada la segunda vez.
      paymentModelMock.findOneAndUpdate = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue(null),
      }));

      await service.handleWebhook('sig', Buffer.from('{}'));

      expect(sessionsService.markAsPaid).not.toHaveBeenCalled();
      expect(eventsGateway.emitPaymentConfirmed).not.toHaveBeenCalled();
    });

    it('rechaza una firma inválida', async () => {
      const service = await build(withStripe);
      stripeMock.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature');
      });

      await expect(service.handleWebhook('mala', Buffer.from('{}'))).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(sessionsService.markAsPaid).not.toHaveBeenCalled();
    });

    it('no cierra la sesión si el pago solo está en proceso (Bizum)', async () => {
      const service = await build(withStripe);
      stripeMock.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.processing',
        data: { object: { id: 'pi_123' } },
      });

      await service.handleWebhook('sig', Buffer.from('{}'));

      expect(paymentModelMock.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ stripePaymentIntentId: 'pi_123' }),
        { status: PaymentStatus.PROCESSING },
        { new: true },
      );
      expect(sessionsService.markAsPaid).not.toHaveBeenCalled();
    });
  });

  describe('syncFromStripe', () => {
    it('cierra el pago consultando a Stripe y guarda el método real usado', async () => {
      const service = await build(withStripe);
      paymentModelMock.findById = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({
          _id: 'pay_1',
          status: PaymentStatus.PENDING,
          stripePaymentIntentId: 'pi_123',
        }),
      }));
      stripeMock.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_123',
        status: 'succeeded',
        latest_charge: {
          payment_method_details: { type: 'card', card: { wallet: { type: 'apple_pay' } } },
        },
      });
      paymentModelMock.findOneAndUpdate = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({ session: 'sess_1' }),
      }));

      await service.syncFromStripe('pay_1');

      expect(paymentModelMock.findOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ method: PaymentMethod.APPLE_PAY }),
        { new: true },
      );
      expect(sessionsService.markAsPaid).toHaveBeenCalledWith('sess_1');
    });

    it('no consulta a Stripe si el pago ya estaba cobrado', async () => {
      const service = await build(withStripe);
      const already = { _id: 'pay_1', status: PaymentStatus.SUCCEEDED };
      paymentModelMock.findById = jest.fn(() => ({ exec: jest.fn().mockResolvedValue(already) }));

      const result = await service.syncFromStripe('pay_1');

      expect(result).toBe(already);
      expect(stripeMock.paymentIntents.retrieve).not.toHaveBeenCalled();
    });
  });
});
