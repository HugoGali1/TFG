import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api';
import { Order, CartItem } from '../models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private api: ApiService) {}

  createOrder(sessionId: string, items: CartItem[], generalNotes?: string): Observable<Order> {
    return this.api.post<Order>('/orders', {
      sessionId,
      items: items.map(i => ({ menuItemId: i.menuItem._id, quantity: i.quantity, cookingLevel: i.cookingLevel, notes: i.notes })),
      generalNotes,
    });
  }

  getBySession(sessionId: string): Observable<Order[]> {
    return this.api.get<Order[]>(`/orders/session/${sessionId}`);
  }

  getActive(): Observable<Order[]> {
    return this.api.get<Order[]>('/orders/active');
  }

  updateOrderStatus(orderId: string, status: string): Observable<Order> {
    return this.api.patch<Order>(`/orders/${orderId}/status`, { status });
  }

  updateItemStatus(orderId: string, itemIndex: number, status: string): Observable<Order> {
    return this.api.patch<Order>('/orders/item-status', { orderId, itemIndex, status });
  }
}
