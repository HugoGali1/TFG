import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PaymentService } from '../../services/payment';
import { SessionService } from '../../services/session';
import { SocketService } from '../../services/socket';
import { LoadingController } from '@ionic/angular';

@Component({ standalone: false, selector: 'app-payment', templateUrl: './payment.page.html', styleUrls: ['./payment.page.scss'] })
export class PaymentPage implements OnInit {
  session$ = this.sessionService.session$;
  tipPercent = 0;
  selectedMethod = 'card';
  receiptEmail = '';

  tipOptions = [
    { label: 'Sin propina', value: 0 },
    { label: '5%', value: 5 },
    { label: '10%', value: 10 },
    { label: '15%', value: 15 },
  ];

  methods = [
    { id: 'card', label: 'Tarjeta', icon: 'card-outline' },
    { id: 'apple_pay', label: 'Apple Pay', icon: 'logo-apple' },
    { id: 'bizum', label: 'Bizum', icon: 'phone-portrait-outline' },
  ];

  constructor(
    public sessionService: SessionService,
    private paymentService: PaymentService,
    private socket: SocketService,
    private router: Router,
    private loading: LoadingController,
  ) {}

  ngOnInit() {
    const sessionId = this.sessionService.sessionId;
    if (sessionId) {
      this.socket.on('payment-confirmed').subscribe(() => {
        this.router.navigateByUrl('/payment-success');
      });
    }
  }

  get subtotal() { return this.sessionService.current?.totalAmount ?? 0; }

  get buffet() { return this.sessionService.current?.buffet; }
  get partySize() { return this.sessionService.current?.partySize ?? 1; }
  get buffetBase() { return this.buffet ? Math.round(this.buffet.pricePerPerson * this.partySize * 100) / 100 : 0; }
  get extrasAmount() { return Math.max(0, Math.round((this.subtotal - this.buffetBase) * 100) / 100); }

  get tipAmount() { return Math.round(this.subtotal * this.tipPercent / 100 * 100) / 100; }
  get total() { return Math.round((this.subtotal + this.tipAmount) * 100) / 100; }

  async pay() {
    const sessionId = this.sessionService.sessionId;
    if (!sessionId) return;
    const loader = await this.loading.create({
      message: this.processingMessage(this.selectedMethod),
      spinner: 'crescent',
    });
    await loader.present();
    this.paymentService.simulate(sessionId, this.tipAmount, this.selectedMethod, this.receiptEmail || undefined).subscribe({
      next: () => {
        loader.dismiss();
        this.router.navigateByUrl('/payment-success');
      },
      error: () => loader.dismiss(),
    });
  }

  private processingMessage(method: string): string {
    if (method === 'apple_pay') return 'Confirmando con Apple Pay…';
    if (method === 'bizum') return 'Esperando confirmación de Bizum…';
    return 'Procesando tarjeta…';
  }
}
