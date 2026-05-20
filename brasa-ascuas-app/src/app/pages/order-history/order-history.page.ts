import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '../../services/order';
import { SessionService } from '../../services/session';
import { Order, OrderItem } from '../../models';

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
  get buffet() { return this.sessionService.current?.buffet; }
  get partySize() { return this.sessionService.current?.partySize ?? 1; }
  get buffetBase() { return this.buffet ? Math.round(this.buffet.pricePerPerson * this.partySize * 100) / 100 : 0; }
  get extrasAmount() { return this.orders.reduce((s, o) => s + o.items.filter(i => !i.coveredByBuffet).reduce((ss, i) => ss + (i.unitPrice ?? 0) * i.quantity, 0), 0); }
  get totalAmount() { return Math.round((this.buffetBase + this.extrasAmount) * 100) / 100; }
  itemPrice(item: OrderItem) { return (item.unitPrice ?? 0) * item.quantity; }

  goPay() { this.router.navigateByUrl('/payment'); }
}
