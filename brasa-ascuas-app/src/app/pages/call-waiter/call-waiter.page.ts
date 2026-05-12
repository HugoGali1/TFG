import { Component } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { WaiterService } from '../../services/waiter';
import { SessionService } from '../../services/session';

@Component({ standalone: false, selector: 'app-call-waiter', templateUrl: './call-waiter.page.html', styleUrls: ['./call-waiter.page.scss'] })
export class CallWaiterPage {
  freeMessage = '';
  sending = false;

  requests = [
    { type: 'call', icon: 'person-outline', label: 'Llamar al camarero', sub: 'Vendrá a vuestra mesa' },
    { type: 'water', icon: 'water-outline', label: 'Más agua / bebidas', sub: 'Reponemos lo que falte' },
    { type: 'cutlery', icon: 'restaurant-outline', label: 'Cubiertos o servilletas', sub: 'Cambio o extras' },
    { type: 'bill', icon: 'receipt-outline', label: 'Pedir la cuenta', sub: 'Sin levantarte' },
    { type: 'menu_question', icon: 'help-circle-outline', label: 'Duda del menú', sub: 'Alérgenos, ingredientes…' },
  ];

  constructor(
    private waiterService: WaiterService,
    private sessionService: SessionService,
    private toast: ToastController,
  ) {}

  async sendRequest(type: string) {
    const sessionId = this.sessionService.sessionId;
    if (!sessionId) return;
    this.sending = true;
    this.waiterService.request(sessionId, type, this.freeMessage || undefined).subscribe({
      next: async () => {
        this.sending = false;
        this.freeMessage = '';
        const t = await this.toast.create({ message: 'Solicitud enviada al equipo', duration: 2000, color: 'dark', position: 'bottom' });
        t.present();
      },
      error: () => { this.sending = false; }
    });
  }
}
