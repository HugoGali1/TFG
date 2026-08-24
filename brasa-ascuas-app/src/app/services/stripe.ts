import { Injectable } from '@angular/core';
import { loadStripe, Stripe, StripeElements, StripeError } from '@stripe/stripe-js';
import { environment } from '../../environments/environment';

export interface ConfirmResult {
  status?: string;
  error?: StripeError;
  /** true si Stripe se va a llevar al usuario a otra página (Bizum, 3DS…). */
  redirecting?: boolean;
}

/**
 * Envuelve Stripe.js. Carga el script una sola vez y de forma perezosa: si la
 * pantalla de pago nunca se abre, nunca se descarga.
 *
 * Se usa el flujo de *deferred intent*: el Payment Element se monta con el
 * importe pero sin client_secret, así el cliente puede cambiar la propina sin
 * que haya que crear un PaymentIntent en cada pulsación. El intent se crea en
 * el backend justo al pulsar "Pagar".
 */
@Injectable({ providedIn: 'root' })
export class StripeService {
  private stripePromise: Promise<Stripe | null> | null = null;
  private elements: StripeElements | null = null;

  /** Hay clave publicable configurada, así que se puede cobrar de verdad. */
  get isConfigured(): boolean {
    return !!environment.stripePublishableKey;
  }

  private load(): Promise<Stripe | null> {
    if (!this.isConfigured) return Promise.resolve(null);
    if (!this.stripePromise) {
      this.stripePromise = loadStripe(environment.stripePublishableKey);
    }
    return this.stripePromise;
  }

  /**
   * Monta el Payment Element dentro del contenedor indicado.
   * @param amountInCents importe inicial; se puede refrescar con updateAmount().
   */
  async mountPaymentElement(selector: string, amountInCents: number): Promise<boolean> {
    const stripe = await this.load();
    if (!stripe) return false;

    this.elements = stripe.elements({
      mode: 'payment',
      amount: amountInCents,
      currency: 'eur',
      appearance: this.appearance(),
    });

    this.elements.create('payment', { layout: 'tabs' }).mount(selector);
    return true;
  }

  /** Refleja en el Element un cambio de importe (por ejemplo, al elegir propina). */
  updateAmount(amountInCents: number): void {
    this.elements?.update({ amount: amountInCents });
  }

  /**
   * Valida los datos introducidos antes de crear el PaymentIntent en el backend.
   * Stripe exige este paso en el flujo de deferred intent.
   */
  async submit(): Promise<StripeError | undefined> {
    if (!this.elements) return undefined;
    const { error } = await this.elements.submit();
    return error;
  }

  /** Confirma el pago. Solo redirige si el método elegido lo exige (Bizum, 3DS). */
  async confirm(clientSecret: string, returnUrl: string): Promise<ConfirmResult> {
    const stripe = await this.load();
    if (!stripe || !this.elements) {
      return { error: { type: 'api_connection_error', message: 'Stripe no está disponible' } as StripeError };
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements: this.elements,
      clientSecret,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    });

    if (error) return { error };
    return { status: paymentIntent?.status };
  }

  /**
   * Lee el resultado de un pago que volvió por redirección (return_url).
   * Stripe añade `payment_intent_client_secret` a la URL al regresar.
   */
  async retrieveFromRedirect(clientSecret: string): Promise<ConfirmResult> {
    const stripe = await this.load();
    if (!stripe) return {};
    const { error, paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
    if (error) return { error };
    return { status: paymentIntent?.status };
  }

  /** Libera el Element al salir de la pantalla de pago. */
  reset(): void {
    this.elements = null;
  }

  /** Ajusta el Payment Element a la paleta del restaurante. */
  private appearance() {
    return {
      theme: 'flat' as const,
      variables: {
        colorPrimary: '#d94a1f',
        colorBackground: '#ffffff',
        colorText: '#1c1410',
        colorTextSecondary: '#8a7967',
        colorDanger: '#d94a1f',
        borderRadius: '12px',
        fontSizeBase: '15px',
      },
      rules: {
        '.Input': { border: '1.5px solid #efe7d7', boxShadow: 'none' },
        '.Input:focus': { border: '1.5px solid #d94a1f', boxShadow: 'none' },
        '.Tab': { border: '1.5px solid #efe7d7', boxShadow: 'none' },
        '.Tab--selected': { border: '1.5px solid #d94a1f', color: '#d94a1f' },
        '.Label': { color: '#4a3a2e', fontWeight: '600' },
      },
    };
  }
}
