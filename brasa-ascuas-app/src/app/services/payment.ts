import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api';
import { Payment } from '../models';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  constructor(private api: ApiService) {}

  createIntent(
    sessionId: string,
    tip: number,
    method?: string,
    receiptEmail?: string,
  ): Observable<Payment> {
    return this.api.post<Payment>('/payments/create-intent', {
      sessionId,
      tip,
      method,
      receiptEmail,
    });
  }

  simulate(sessionId: string, tip: number, method?: string, receiptEmail?: string): Observable<Payment> {
    return this.api.post<Payment>('/payments/simulate', { sessionId, tip, method, receiptEmail });
  }

  /**
   * Pide al backend que contraste el pago con Stripe.
   *
   * El webhook es la vía normal, pero en local no llega salvo que se ejecute
   * `stripe listen`. Llamando aquí tras confirmar, la sesión se cierra igual.
   */
  sync(paymentId: string): Observable<Payment> {
    return this.api.post<Payment>(`/payments/${paymentId}/sync`, {});
  }

  getBySession(sessionId: string): Observable<Payment[]> {
    return this.api.get<Payment[]>(`/payments/session/${sessionId}`);
  }
}
