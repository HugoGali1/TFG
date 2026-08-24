import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { PaymentService } from '../../services/payment';
import { SessionService } from '../../services/session';
import { SocketService } from '../../services/socket';
import { StripeService } from '../../services/stripe';
import { ApiService } from '../../services/api';
import { LoadingController, ToastController } from '@ionic/angular';
import { Order, OrderItem, Payment } from '../../models';

/** Contenedor donde Stripe.js inyecta el Payment Element. */
const STRIPE_HOST = '#stripe-payment-element';

@Component({ standalone: false, selector: 'app-payment', templateUrl: './payment.page.html', styleUrls: ['./payment.page.scss'] })
export class PaymentPage implements OnInit, AfterViewInit, OnDestroy {
  session$ = this.sessionService.session$;
  tipPercent = 0;
  selectedMethod = 'card';
  receiptEmail = '';
  orders: Order[] = [];

  /** Hay clave publicable: se cobra con Stripe en vez de simular. */
  useStripe = this.stripe.isConfigured;
  /** El Payment Element ya está montado y puede recibir datos. */
  stripeReady = false;
  /** Falló la carga de Stripe.js: se avisa y se cae a la simulación. */
  stripeFailed = false;
  paying = false;

  private mounting = false;
  private subs = new Subscription();
  /** Loader activo, para poder cerrarlo desde cualquier vía de confirmación. */
  private activeLoader: HTMLIonLoadingElement | null = null;
  private finished = false;

  tipOptions = [
    { label: 'Sin propina', value: 0 },
    { label: '5%', value: 5 },
    { label: '10%', value: 10 },
    { label: '15%', value: 15 },
  ];

  // Solo se usan en modo simulado; con Stripe, el Payment Element muestra
  // los métodos realmente activados en la cuenta.
  methods = [
    { id: 'card', label: 'Tarjeta', icon: 'card-outline' },
    { id: 'apple_pay', label: 'Apple Pay', icon: 'logo-apple' },
    { id: 'bizum', label: 'Bizum', icon: 'phone-portrait-outline' },
  ];

  constructor(
    public sessionService: SessionService,
    private paymentService: PaymentService,
    private stripe: StripeService,
    private socket: SocketService,
    private api: ApiService,
    private router: Router,
    private loading: LoadingController,
    private toast: ToastController,
  ) {}

  ngOnInit() {
    const sessionId = this.sessionService.sessionId;
    if (sessionId) {
      this.api.get<Order[]>(`/orders/session/${sessionId}`).subscribe(orders => {
        this.orders = orders;
      });
      // El backend confirma por WebSocket (webhook o sync). Puede llegar antes
      // de que termine la llamada HTTP, así que se cierra el loader aquí también.
      this.subs.add(
        this.socket.on('payment-confirmed').subscribe(() => {
          void this.goToSuccess();
        }),
      );
    }

    // Si la sesión aún no había cargado, el contenedor del Element no existe
    // en el DOM al arrancar: se monta en cuanto aparezca.
    this.subs.add(
      this.session$.subscribe(session => {
        if (session) setTimeout(() => this.mountStripe());
      }),
    );
  }

  ngAfterViewInit() {
    this.mountStripe();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.stripe.reset();
    void this.dismissLoader();
  }

  /**
   * Cierra el pago una sola vez, venga por donde venga (respuesta HTTP o evento
   * WebSocket). Sin esto, si el WS gana la carrera el spinner se queda colgado
   * por encima de la pantalla de éxito.
   */
  private async goToSuccess() {
    if (this.finished) return;
    this.finished = true;
    sessionStorage.removeItem('pendingPaymentId');
    await this.dismissLoader();
    await this.router.navigateByUrl('/payment-success');
  }

  private async dismissLoader() {
    const loader = this.activeLoader;
    this.activeLoader = null;
    await loader?.dismiss().catch(() => undefined);
  }

  private async presentLoader(message: string) {
    const loader = await this.loading.create({ message, spinner: 'crescent' });
    this.activeLoader = loader;
    await loader.present();
  }

  /** Monta el Payment Element una sola vez, cuando su contenedor ya existe. */
  private async mountStripe() {
    if (!this.useStripe || this.stripeReady || this.mounting) return;
    if (!document.querySelector(STRIPE_HOST)) return;

    this.mounting = true;
    try {
      this.stripeReady = await this.stripe.mountPaymentElement(STRIPE_HOST, this.totalInCents);
    } catch {
      this.stripeFailed = true;
      this.useStripe = false;
      await this.showToast('No se pudo cargar Stripe, se usará el pago simulado');
    } finally {
      this.mounting = false;
    }
  }

  selectTip(value: number) {
    this.tipPercent = value;
    // El Element necesita saber el importe actualizado para decidir qué
    // métodos ofrecer (algunos tienen mínimos o máximos).
    if (this.stripeReady) this.stripe.updateAmount(this.totalInCents);
  }

  get allItems(): OrderItem[] {
    const map = new Map<string, OrderItem>();
    for (const order of this.orders) {
      for (const item of order.items) {
        const key = `${item.name}-${item.cookingLevel ?? ''}-${item.coveredByBuffet}`;
        if (map.has(key)) {
          const existing = map.get(key)!;
          existing.quantity += item.quantity;
          existing.linePrice = (existing.linePrice ?? 0) + (item.linePrice ?? 0);
        } else {
          map.set(key, { ...item });
        }
      }
    }
    return Array.from(map.values());
  }

  get subtotal() { return this.sessionService.current?.totalAmount ?? 0; }

  get buffet() { return this.sessionService.current?.buffet; }
  get partySize() { return this.sessionService.current?.partySize ?? 1; }
  get buffetBase() { return this.buffet ? Math.round(this.buffet.pricePerPerson * this.partySize * 100) / 100 : 0; }
  get extrasAmount() { return Math.max(0, Math.round((this.subtotal - this.buffetBase) * 100) / 100); }

  get tipAmount() { return Math.round(this.subtotal * this.tipPercent / 100 * 100) / 100; }
  get total() { return Math.round((this.subtotal + this.tipAmount) * 100) / 100; }
  get totalInCents() { return Math.round(this.total * 100); }

  async pay() {
    const sessionId = this.sessionService.sessionId;
    if (!sessionId || this.paying) return;

    this.paying = true;
    try {
      if (this.useStripe && this.stripeReady) {
        await this.payWithStripe(sessionId);
      } else {
        await this.paySimulated(sessionId);
      }
    } finally {
      this.paying = false;
    }
  }

  /**
   * Flujo real: validar el Element → crear el PaymentIntent → confirmar.
   *
   * Con `redirect: 'if_required'` la tarjeta se resuelve sin salir de la app;
   * Bizum o un 3DS sí redirigen, y el resultado se recoge en payment-success.
   */
  private async payWithStripe(sessionId: string) {
    const submitError = await this.stripe.submit();
    if (submitError) {
      await this.showToast(submitError.message ?? 'Revisa los datos de pago');
      return;
    }

    await this.presentLoader('Procesando pago…');

    let payment: Payment;
    try {
      payment = await firstValueFrom(
        this.paymentService.createIntent(
          sessionId,
          this.tipAmount,
          undefined, // con Stripe el método lo elige el Payment Element
          this.receiptEmail || undefined,
        ),
      );
    } catch {
      // El interceptor HTTP ya ha mostrado el toast con el motivo.
      await this.dismissLoader();
      return;
    }

    if (!payment.stripeClientSecret) {
      await this.dismissLoader();
      await this.showToast('El servidor no devolvió el secreto de pago');
      return;
    }

    // Si Stripe redirige, al volver necesitamos saber qué pago reconciliar.
    sessionStorage.setItem('pendingPaymentId', payment._id);

    const returnUrl = `${window.location.origin}/payment-success`;
    const result = await this.stripe.confirm(payment.stripeClientSecret, returnUrl);

    if (result.error) {
      await this.dismissLoader();
      await this.showToast(result.error.message ?? 'No se pudo completar el pago');
      return;
    }

    if (result.status === 'succeeded' || result.status === 'processing') {
      // Respaldo del webhook: en local no hay `stripe listen` y sin esto la
      // sesión se quedaría abierta. Es idempotente en el backend.
      await firstValueFrom(this.paymentService.sync(payment._id)).catch(() => null);
      await this.goToSuccess();
      return;
    }

    await this.dismissLoader();
    await this.showToast('El pago no se ha completado');
  }

  /** Flujo de demo, sin claves de Stripe. */
  private async paySimulated(sessionId: string) {
    await this.presentLoader(this.processingMessage(this.selectedMethod));
    try {
      await firstValueFrom(
        this.paymentService.simulate(
          sessionId,
          this.tipAmount,
          this.selectedMethod,
          this.receiptEmail || undefined,
        ),
      );
      await this.goToSuccess();
    } catch {
      // El interceptor ya ha avisado.
      await this.dismissLoader();
    }
  }

  private processingMessage(method: string): string {
    if (method === 'apple_pay') return 'Confirmando con Apple Pay…';
    if (method === 'bizum') return 'Esperando confirmación de Bizum…';
    return 'Procesando tarjeta…';
  }

  private async showToast(message: string) {
    const t = await this.toast.create({ message, duration: 3500, position: 'top', color: 'danger' });
    await t.present();
  }
}
