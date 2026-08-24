import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SessionService } from '../../services/session';
import { ApiService } from '../../services/api';
import { PaymentService } from '../../services/payment';
import { StripeService } from '../../services/stripe';

@Component({ standalone: false, selector: 'app-payment-success', templateUrl: './payment-success.page.html', styleUrls: ['./payment-success.page.scss'] })
export class PaymentSuccessPage implements OnInit {
  rating = 0;
  comment = '';
  submitted = false;
  sending = false;
  now = new Date();
  private sessionId: string | null = null;

  constructor(
    private sessionService: SessionService,
    private api: ApiService,
    private paymentService: PaymentService,
    private stripe: StripeService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.sessionId = this.sessionService.sessionId;
    // Se cierra el pago que volvió por redirección antes de limpiar la sesión.
    void this.settleRedirectedPayment().finally(() => this.sessionService.clear());
  }

  /**
   * Los métodos con redirección (Bizum, 3DS) traen de vuelta al usuario a esta
   * página con `payment_intent_client_secret` en la URL. Se confirma el estado
   * con Stripe y se avisa al backend, que es idempotente: si el webhook ya lo
   * había procesado, esto no cambia nada.
   */
  private async settleRedirectedPayment(): Promise<void> {
    const clientSecret = this.route.snapshot.queryParamMap.get('payment_intent_client_secret');
    const paymentId = sessionStorage.getItem('pendingPaymentId');
    if (!clientSecret || !paymentId) return;

    sessionStorage.removeItem('pendingPaymentId');

    const result = await this.stripe.retrieveFromRedirect(clientSecret);
    if (result.status !== 'succeeded' && result.status !== 'processing') return;

    await firstValueFrom(this.paymentService.sync(paymentId)).catch(() => null);
  }

  setRating(r: number) {
    if (this.submitted) return;
    this.rating = r;
  }

  submitFeedback() {
    if (this.submitted || this.sending || !this.rating || !this.sessionId) return;
    this.sending = true;
    this.api.post('/feedback', {
      sessionId: this.sessionId,
      rating: this.rating,
      comment: this.comment.trim() || undefined,
    }).subscribe({
      next: () => {
        this.submitted = true;
        this.sending = false;
      },
      error: () => { this.sending = false; },
    });
  }

  get emojis() { return ['😞','😐','🙂','😍','🔥']; }
}
