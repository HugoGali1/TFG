import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api';
import { Payment } from '../models';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  constructor(private api: ApiService) {}

  createIntent(sessionId: string, tip: number, receiptEmail?: string): Observable<Payment> {
    return this.api.post<Payment>('/payments/create-intent', { sessionId, tip, receiptEmail });
  }

  simulate(sessionId: string, tip: number, method?: string, receiptEmail?: string): Observable<Payment> {
    return this.api.post<Payment>('/payments/simulate', { sessionId, tip, method, receiptEmail });
  }

  getBySession(sessionId: string): Observable<Payment[]> {
    return this.api.get<Payment[]>(`/payments/session/${sessionId}`);
  }
}
