import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { OrderService } from '../../services/order';
import { MenuService } from '../../services/menu';
import { WaiterService, WaiterRequest } from '../../services/waiter';
import { AuthService } from '../../services/auth';
import { SocketService } from '../../services/socket';
import { Order, OrderItem } from '../../models';
import { statusLabel, nextStatusLabel, nextStatus } from '../../utils/status-label';

@Component({ standalone: false, selector: 'app-kitchen', templateUrl: './kitchen.page.html', styleUrls: ['./kitchen.page.scss'] })
export class KitchenPage implements OnInit, OnDestroy {
  orders: Order[] = [];
  waiterRequests: WaiterRequest[] = [];
  activeTab: 'orders' | 'requests' = 'orders';
  newOrderIds = new Set<string>();
  private subs: Subscription[] = [];
  private bell?: HTMLAudioElement;
  private lastBeepAt = 0;

  constructor(
    private orderService: OrderService,
    private menuService: MenuService,
    private waiterService: WaiterService,
    public authService: AuthService,
    private socket: SocketService,
  ) {}

  ngOnInit() {
    this.loadOrders();
    this.loadRequests();
    this.socket.joinKitchen();
    this.socket.joinWaiters();

    this.subs.push(
      this.socket.on<Order>('new-order').subscribe(order => {
        if (this.orders.some(o => o._id === order._id)) return;
        this.orders.unshift(order);
        this.notifyNewOrder(order._id);
      }),
      this.socket.on<Order>('order-updated').subscribe(updated => {
        const idx = this.orders.findIndex(o => o._id === updated._id);
        if (idx >= 0) this.orders[idx] = updated;
      }),
      this.socket.on<WaiterRequest>('waiter-request').subscribe(req => {
        this.waiterRequests.unshift(req);
      }),
    );
  }

  loadOrders() {
    this.orderService.getActive().subscribe(orders => { this.orders = orders; });
  }

  loadRequests() {
    this.waiterService.getPending().subscribe(reqs => { this.waiterRequests = reqs; });
  }

  setItemStatus(order: Order, itemIndex: number, status: string) {
    this.orderService.updateItemStatus(order._id, itemIndex, status).subscribe(updated => {
      const idx = this.orders.findIndex(o => o._id === order._id);
      if (idx >= 0) this.orders[idx] = updated;
    });
  }

  markServed(order: Order) {
    this.orderService.updateOrderStatus(order._id, 'served').subscribe(updated => {
      this.orders = this.orders.filter(o => o._id !== updated._id);
    });
  }

  resolveRequest(req: WaiterRequest) {
    this.waiterService.resolve(req._id).subscribe(() => {
      this.waiterRequests = this.waiterRequests.filter(r => r._id !== req._id);
    });
  }

  statusLabel(s: string, item?: OrderItem) { return statusLabel(s, item); }

  nextStatus(s: string, item?: OrderItem): string { return nextStatus(s, item); }

  tableNumber(order: Order): number | string {
    const t = order.table;
    return typeof t === 'object' ? t.number : '–';
  }

  nextStatusLabel(s: string, item?: OrderItem): string { return nextStatusLabel(s, item); }

  /** Beep + flash visual + título de pestaña al entrar un pedido nuevo. */
  private notifyNewOrder(orderId: string) {
    this.newOrderIds.add(orderId);
    setTimeout(() => this.newOrderIds.delete(orderId), 4000);
    this.playBell();
    this.flashTitleIfHidden();
  }

  private playBell() {
    const now = Date.now();
    if (now - this.lastBeepAt < 800) return; // throttle: 1 beep / 800ms
    this.lastBeepAt = now;
    if (!this.bell) {
      this.bell = new Audio('assets/sounds/new-order.mp3');
      this.bell.volume = 0.55;
    }
    this.bell.currentTime = 0;
    // El navegador puede bloquear si el usuario aún no ha interactuado;
    // tras el primer click (login submit) ya es seguro.
    this.bell.play().catch(() => { /* autoplay blocked: ignorar */ });
  }

  private flashTitleIfHidden() {
    if (!document.hidden) return;
    const original = document.title;
    document.title = '🔔 Pedido nuevo · Brasa & Ascuas';
    const reset = () => {
      document.title = original;
      document.removeEventListener('visibilitychange', reset);
    };
    document.addEventListener('visibilitychange', reset);
  }

  ngOnDestroy() { this.subs.forEach(s => s.unsubscribe()); }
}
