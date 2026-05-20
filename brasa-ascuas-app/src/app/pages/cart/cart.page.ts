import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart';
import { OrderService } from '../../services/order';
import { SessionService } from '../../services/session';
import { LoadingController, ToastController } from '@ionic/angular';

@Component({ standalone: false, selector: 'app-cart', templateUrl: './cart.page.html', styleUrls: ['./cart.page.scss'] })
export class CartPage {
  items$ = this.cartService.items$;
  generalNotes = '';

  isCovered(menuItem: { category: any }): boolean {
    const buffet = this.sessionService.current?.buffet;
    if (!buffet) return false;
    const catId = typeof menuItem.category === 'object' ? menuItem.category._id : menuItem.category;
    return buffet.includedCategories.some(c => (typeof c === 'object' ? c._id : c) === catId);
  }

  get extrasTotal(): number {
    return Math.round(this.cartService.items
      .filter(i => !this.isCovered(i.menuItem))
      .reduce((s, i) => s + i.menuItem.price * i.quantity, 0) * 100) / 100;
  }

  get coveredCount(): number {
    return this.cartService.items
      .filter(i => this.isCovered(i.menuItem))
      .reduce((s, i) => s + i.quantity, 0);
  }

  constructor(
    public cartService: CartService,
    private orderService: OrderService,
    public sessionService: SessionService,
    private router: Router,
    private loading: LoadingController,
    private toast: ToastController,
  ) {}

  changeQty(index: number, delta: number) {
    const item = this.cartService.items[index];
    this.cartService.updateQuantity(index, item.quantity + delta);
  }

  remove(index: number) { this.cartService.remove(index); }

  async sendToKitchen() {
    const sessionId = this.sessionService.sessionId;
    if (!sessionId) {
      const t = await this.toast.create({ message: 'No hay sesión activa. Escanea el QR de la mesa.', duration: 3000, color: 'warning' });
      t.present();
      return;
    }
    if (this.cartService.items.length === 0) return;
    const loader = await this.loading.create({ message: 'Enviando a cocina…' });
    await loader.present();
    const token = this.sessionService.current?.token;
    this.orderService.createOrder(sessionId, this.cartService.items, this.generalNotes || undefined).subscribe({
      next: (order) => {
        loader.dismiss();
        this.cartService.clear();
        if (token) {
          this.sessionService.loadByToken(token).subscribe();
        }
        this.router.navigate(['/order-confirmation'], { state: { order } });
      },
      error: () => loader.dismiss(),
    });
  }
}
