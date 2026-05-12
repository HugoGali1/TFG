import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '../../services/order';
import { SessionService } from '../../services/session';
import { Order, OrderItem } from '../../models';
import { statusLabel, statusColorClass } from '../../utils/status-label';

@Component({ standalone: false, selector: 'app-order-history', templateUrl: './order-history.page.html', styleUrls: ['./order-history.page.scss'] })
export class OrderHistoryPage implements OnInit {
  orders: Order[] = [];
  session$ = this.sessionService.session$;

  constructor(
    private orderService: OrderService,
    public sessionService: SessionService,
    private router: Router,
  ) {}

  ngOnInit() {
    const sid = this.sessionService.sessionId;
    if (sid) this.orderService.getBySession(sid).subscribe(o => this.orders = o);
  }

  get totalPlatos() { return this.orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0); }
  get totalAmount() { return this.orders.reduce((s, o) => s + o.totalAmount, 0); }

  statusLabel(s: string, item?: OrderItem) { return statusLabel(s, item); }
  statusColor(s: string) { return statusColorClass(s); }

  goPay() { this.router.navigateByUrl('/payment'); }
}
