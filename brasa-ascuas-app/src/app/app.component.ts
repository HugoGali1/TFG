import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription, filter } from 'rxjs';
import { SocketService } from './services/socket';
import { SessionService } from './services/session';
import { Order } from './models';

/**
 * Rutas del flujo de cliente, el que se usa desde el movil en la mesa. En
 * pantalla grande se encuadran con ancho de telefono (.phone-frame en
 * global.scss) para que se vean como se ven de verdad. Cocina, admin, login y
 * la demo quedan fuera: esas si estan pensadas para pantalla grande.
 */
const CLIENT_ROUTES = new Set([
  'mesa', 't', 'welcome', 'choose-buffet', 'menu', 'dish-detail', 'cart',
  'order-confirmation', 'order-status', 'order-history', 'call-waiter',
  'payment', 'payment-success',
]);

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  /** orderId → snapshot del status de cada item, para detectar transiciones */
  private lastStatuses = new Map<string, string[]>();

  constructor(
    private socket: SocketService,
    private sessionService: SessionService,
    private toast: ToastController,
    private router: Router,
  ) {}

  private subs: Subscription[] = [];

  ngOnInit() {
    this.applyPhoneFrame(this.router.url);
    this.subs.push(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(e => this.applyPhoneFrame(e.urlAfterRedirects)),
    );

    // Garantiza que el cliente esté en la sala de su sesión incluso si recarga
    // directo en /menu o /cart (saltándose welcome).
    this.subs.push(
      this.sessionService.session$.subscribe(session => {
        if (session?._id) this.socket.joinSession(session._id);
      }),
    );

    this.subs.push(
      this.socket.on<Order>('order-updated').subscribe(order => {
        // Solo notificamos al cliente (que tiene sesión de mesa). El staff de
        // cocina/admin no debe ver estos toasts.
        if (!this.sessionService.current) return;
        // Aseguramos que el evento es de la sesión del cliente actual.
        const sid = order.session;
        if (sid && sid !== this.sessionService.current._id) return;
        this.detectReadyTransitions(order);
      }),
    );
  }

  /** Marca el body cuando la ruta activa pertenece al flujo de cliente. */
  private applyPhoneFrame(url: string) {
    const segment = url.split('?')[0].split('#')[0].split('/').filter(Boolean)[0] ?? '';
    document.body.classList.toggle('phone-frame', CLIENT_ROUTES.has(segment));
  }

  private detectReadyTransitions(order: Order) {
    const prev = this.lastStatuses.get(order._id);
    if (!prev) {
      // Primera vez que vemos este pedido (p. ej. cliente recargó la página).
      // Si algún item ya está en 'ready', notificamos: significa que el cocinero
      // lo marcó listo y el cliente debe enterarse.
      order.items.forEach(item => {
        if (item.status === 'ready') this.notifyReady(item.name);
      });
    } else {
      // Actualización posterior: notificamos solo en transiciones a 'ready'.
      order.items.forEach((item, idx) => {
        const prevStatus = prev[idx];
        if (item.status === 'ready' && prevStatus !== 'ready') {
          this.notifyReady(item.name);
        }
      });
    }
    this.lastStatuses.set(order._id, order.items.map(i => i.status));
  }

  private async notifyReady(name: string) {
    const t = await this.toast.create({
      message: `🔥 ¡Tu ${name} está listo!`,
      duration: 4500,
      position: 'top',
      color: 'warning',
      buttons: [
        { text: 'Ver pedido', handler: () => this.router.navigateByUrl('/order-status') },
        { text: 'OK', role: 'cancel' },
      ],
    });
    t.present();
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }
}
