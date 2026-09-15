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

  /** El visitante ha desplegado la lista para elegir mesa el mismo. */
  pickingTable = false;

  /** Ya ha hecho el paso 1, asi que el 2 deja de ser una sugerencia a ciegas. */
  hasSeated = false;

  /** Url que el bloqueador de ventanas emergentes ha cortado, para ofrecer un enlace normal. */
  blockedUrl = '';

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

  /** La mesa que se propone por defecto: la primera libre, o la primera que haya. */
  get suggestedTable(): Table | null {
    return this.tables.find((t) => t.status === 'free') ?? this.tables[0] ?? null;
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = { free: 'Libre', occupied: 'Ocupada', cleaning: 'Por limpiar', reserved: 'Reservada' };
    return m[s] ?? s;
  }

  togglePicker() {
    this.pickingTable = !this.pickingTable;
  }

  dismissBlocked() {
    this.blockedUrl = '';
  }

  /**
   * Abre en pestana nueva y detecta si el navegador lo ha bloqueado, para poder
   * ofrecer un enlace normal en vez de no hacer nada en silencio.
   */
  private openTab(url: string) {
    const win = window.open(url, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      this.blockedUrl = url;
      return;
    }
    this.blockedUrl = '';
  }

  async seat(table: Table | null) {
    if (!table) return;
    const loader = await this.loadingCtrl.create({ message: 'Preparando la mesa…' });
    await loader.present();
    await this.loginAdminSilent();
    this.api.post(`/sessions/reset-table/${table._id}`, {}).subscribe({
      next: () => {
        loader.dismiss();
        this.refreshTableLocally(table);
        this.hasSeated = true;
        this.pickingTable = false;
        this.openTab(`/t/${table.qrCode}`);
      },
      error: () => loader.dismiss(),
    });
  }

  openKitchen() {
    // /login?auto=cocina autenticara y redirigira a /kitchen en la nueva pestana.
    // La pestana actual sigue con sesion admin para proximas acciones.
    this.openTab('/login?auto=cocina');
  }

  openAdmin() {
    this.openTab('/login?auto=admin');
  }

  private refreshTableLocally(table: Table) {
    const idx = this.tables.findIndex(t => t._id === table._id);
    if (idx >= 0) this.tables[idx] = { ...this.tables[idx], status: 'free' };
  }
}
