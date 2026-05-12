import { Component, OnDestroy, OnInit } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth';
import { Table } from '../../models';

@Component({ standalone: false, selector: 'app-dev', templateUrl: './dev.page.html', styleUrls: ['./dev.page.scss'] })
export class DevPage implements OnInit, OnDestroy {
  tables: Table[] = [];
  loading = true;
  error = '';

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private loadingCtrl: LoadingController,
  ) {}

  ngOnInit() {
    this.loginAdminSilent().then(() => this.loadTables());
    document.addEventListener('visibilitychange', this.onVisible);
  }

  ngOnDestroy() {
    document.removeEventListener('visibilitychange', this.onVisible);
  }

  private onVisible = () => {
    if (document.visibilityState === 'visible' && !this.loading) {
      this.loginAdminSilent().then(() => this.loadTables());
    }
  };

  private loginAdminSilent(): Promise<void> {
    return new Promise((resolve) => {
      this.auth.login('admin@brasaascuas.es', 'admin1234').subscribe({
        next: () => resolve(),
        error: () => resolve(),
      });
    });
  }

  private loadTables() {
    this.api.get<Table[]>('/tables').subscribe({
      next: (tables) => {
        this.tables = tables.sort((a, b) => a.number - b.number);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'No se ha podido cargar las mesas';
      },
    });
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = { free: 'Libre', occupied: 'Ocupada', cleaning: 'Por limpiar', reserved: 'Reservada' };
    return m[s] ?? s;
  }

  async openTable(table: Table) {
    const loader = await this.loadingCtrl.create({ message: 'Reseteando mesa…' });
    await loader.present();
    await this.loginAdminSilent();
    this.api.post(`/sessions/reset-table/${table._id}`, {}).subscribe({
      next: () => {
        loader.dismiss();
        this.refreshTableLocally(table);
        window.open(`/t/${table.qrCode}`, '_blank');
      },
      error: () => loader.dismiss(),
    });
  }

  openKitchen() {
    // /login?auto=cocina autenticará y redirigirá a /kitchen en la nueva pestaña.
    // La pestaña actual (/dev) sigue con sesión admin para próximas acciones.
    window.open('/login?auto=cocina', '_blank');
  }

  openAdmin() {
    window.open('/login?auto=admin', '_blank');
  }

  private refreshTableLocally(table: Table) {
    const idx = this.tables.findIndex(t => t._id === table._id);
    if (idx >= 0) this.tables[idx] = { ...this.tables[idx], status: 'free' };
  }
}
