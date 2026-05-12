import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { OrderService } from '../../services/order';
import { SessionService } from '../../services/session';
import { SocketService } from '../../services/socket';
import { Order, OrderItem } from '../../models';
import { statusLabel } from '../../utils/status-label';

@Component({ standalone: false, selector: 'app-order-status', templateUrl: './order-status.page.html', styleUrls: ['./order-status.page.scss'] })
export class OrderStatusPage implements OnInit, OnDestroy {
  orders: Order[] = [];
  private sub?: Subscription;

  constructor(
    private orderService: OrderService,
    private sessionService: SessionService,
    private socket: SocketService,
    private router: Router,
  ) {}

  ngOnInit() {
    const sessionId = this.sessionService.sessionId;
    if (sessionId) {
      this.socket.joinSession(sessionId);
      this.loadOrders(sessionId);
      this.sub = this.socket.on<Order>('order-updated').subscribe(updated => {
        const idx = this.orders.findIndex(o => o._id === updated._id);
        if (idx >= 0) this.orders[idx] = updated;
        else this.orders.unshift(updated);
      });
      // Refresca cuando la pestaña vuelve a primer plano (móvil que sale y entra)
      this.visibilityHandler = () => {
        if (document.visibilityState === 'visible') this.loadOrders(sessionId);
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  private visibilityHandler?: () => void;

  loadOrders(sessionId: string) {
    this.orderService.getBySession(sessionId).subscribe(orders => {
      this.orders = orders.slice().reverse();
    });
  }

  statusLabel(s: string, item?: OrderItem) { return statusLabel(s, item); }

  statusColor(s: string) {
    const map: Record<string,string> = { received: 'gold', cooking: 'red', ready: 'green', served: 'green', cancelled: 'gray' };
    return map[s] ?? 'gray';
  }

  orderMore() { this.router.navigateByUrl('/menu'); }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
  }
}
