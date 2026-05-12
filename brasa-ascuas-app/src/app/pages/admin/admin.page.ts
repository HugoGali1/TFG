import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth';
import { Buffet, Category, DashboardStats, MenuItem, Table } from '../../models';

type Tab = 'tables' | 'menu' | 'buffets' | 'stats';

@Component({ standalone: false, selector: 'app-admin', templateUrl: './admin.page.html', styleUrls: ['./admin.page.scss'] })
export class AdminPage implements OnInit, OnDestroy {
  activeTab: Tab = 'tables';

  tables: Table[] = [];
  items: MenuItem[] = [];
  categories: Category[] = [];
  buffets: Buffet[] = [];
  stats: DashboardStats | null = null;
  selectedCategoryFilter = '';

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private router: Router,
    private alert: AlertController,
    private toast: ToastController,
  ) {}

  async ngOnInit() {
    await this.ensureAdminAuth();
    this.loadAll();
    document.addEventListener('visibilitychange', this.onVisible);
  }

  ngOnDestroy() {
    document.removeEventListener('visibilitychange', this.onVisible);
  }

  private onVisible = async () => {
    if (document.visibilityState === 'visible') {
      await this.ensureAdminAuth();
      this.loadAll();
    }
  };

  /**
   * El token de auth se guarda en localStorage, que es compartido entre pestañas.
   * Si otra pestaña ha hecho login con un rol distinto (ej. cocina), el admin pierde
   * su token. Esta función re-autentica silenciosamente como admin si hace falta.
   */
  private ensureAdminAuth(): Promise<void> {
    return new Promise((resolve) => {
      if (this.auth.getRole() === 'admin' && this.auth.isLoggedIn()) return resolve();
      this.auth.login('admin@brasaascuas.es', 'admin1234').subscribe({
        next: () => resolve(),
        error: () => resolve(),
      });
    });
  }

  setTab(t: Tab) { this.activeTab = t; }

  loadAll() {
    this.loadTables();
    this.loadMenu();
    this.loadBuffets();
    this.loadStats();
  }

  // --- Stats ---

  private loadStats() {
    this.api.get<DashboardStats>('/stats/dashboard').subscribe(s => this.stats = s);
  }

  topItemMaxQty(): number {
    return this.stats?.topItems?.[0]?.quantity ?? 1;
  }

  topBuffetMaxSessions(): number {
    return this.stats?.topBuffets?.[0]?.sessions ?? 1;
  }

  // --- Mesas ---

  private loadTables() {
    this.api.get<Table[]>('/tables').subscribe(t => this.tables = t.sort((a, b) => a.number - b.number));
  }

  async addTable() {
    const al = await this.alert.create({
      header: 'Nueva mesa',
      inputs: [
        { name: 'number', type: 'number', placeholder: 'Número', min: 1 },
        { name: 'capacity', type: 'number', placeholder: 'Capacidad', min: 1, value: 4 },
        { name: 'zone', type: 'text', placeholder: 'Zona (interior, terraza, barra, privado)', value: 'interior' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: async (data) => {
            const dto = { number: Number(data.number), capacity: Number(data.capacity), zone: data.zone };
            if (!dto.number || !dto.capacity || !dto.zone) return false;
            await this.ensureAdminAuth();
            this.api.post<Table>('/tables', dto).subscribe(() => this.loadTables());
            return true;
          },
        },
      ],
    });
    al.present();
  }

  async deleteTable(t: Table) {
    const al = await this.alert.create({
      header: `Eliminar Mesa ${t.number}?`,
      message: 'Esto no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar', role: 'destructive', handler: async () => {
            await this.ensureAdminAuth();
            this.api.delete(`/tables/${t._id}`).subscribe(() => this.loadTables());
          },
        },
      ],
    });
    al.present();
  }

  copyQrUrl(t: Table) {
    const base = window.location.origin;
    const url = `${base}/t/${t.qrCode}`;
    navigator.clipboard?.writeText(url);
    this.toastMsg(`URL copiada: ${url}`);
  }

  zones = ['interior', 'terraza', 'barra', 'privado'];

  // --- Platos ---

  private loadMenu() {
    this.api.get<Category[]>('/menu/categories').subscribe(c => this.categories = c.sort((a, b) => a.order - b.order));
    this.api.get<MenuItem[]>('/menu/items').subscribe(i => this.items = i);
  }

  get filteredItems(): MenuItem[] {
    if (!this.selectedCategoryFilter) return this.items;
    return this.items.filter(i => {
      const cid = typeof i.category === 'object' ? i.category._id : i.category;
      return cid === this.selectedCategoryFilter;
    });
  }

  categoryName(item: MenuItem): string {
    if (typeof item.category === 'object') return item.category.name;
    const cat = this.categories.find(c => c._id === item.category);
    return cat?.name ?? '–';
  }

  async toggleAvailable(item: MenuItem) {
    await this.ensureAdminAuth();
    this.api.patch<MenuItem>(`/menu/items/${item._id}/toggle`, {}).subscribe(updated => {
      const idx = this.items.findIndex(i => i._id === item._id);
      if (idx >= 0) this.items[idx] = updated;
    });
  }

  async editItemPrice(item: MenuItem) {
    const al = await this.alert.create({
      header: item.name,
      message: 'Editar precio (€)',
      inputs: [{ name: 'price', type: 'number', value: item.price.toString(), min: 0 }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar', handler: async (data) => {
            const price = Number(data.price);
            if (Number.isNaN(price) || price < 0) return false;
            await this.ensureAdminAuth();
            this.api.patch<MenuItem>(`/menu/items/${item._id}`, { price }).subscribe(updated => {
              const idx = this.items.findIndex(i => i._id === item._id);
              if (idx >= 0) this.items[idx] = updated;
              this.toastMsg('Precio actualizado');
            });
            return true;
          },
        },
      ],
    });
    al.present();
  }

  async deleteItem(item: MenuItem) {
    const al = await this.alert.create({
      header: `Eliminar "${item.name}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar', role: 'destructive', handler: async () => {
            await this.ensureAdminAuth();
            this.api.delete(`/menu/items/${item._id}`).subscribe(() => this.loadMenu());
          },
        },
      ],
    });
    al.present();
  }

  // --- Buffets ---

  private loadBuffets() {
    this.api.get<Buffet[]>('/buffets').subscribe(b => this.buffets = b);
  }

  catNames(b: Buffet): string {
    return b.includedCategories.map(c => typeof c === 'object' ? c.name : c).join(' · ');
  }

  async editBuffetPrice(b: Buffet) {
    const al = await this.alert.create({
      header: b.name,
      message: 'Precio por persona (€)',
      inputs: [{ name: 'price', type: 'number', value: b.pricePerPerson.toString(), min: 0 }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar', handler: async (data) => {
            const price = Number(data.price);
            if (Number.isNaN(price) || price < 0) return false;
            await this.ensureAdminAuth();
            this.api.patch<Buffet>(`/buffets/${b._id}`, { pricePerPerson: price }).subscribe(updated => {
              const idx = this.buffets.findIndex(x => x._id === b._id);
              if (idx >= 0) this.buffets[idx] = updated;
              this.toastMsg('Precio actualizado');
            });
            return true;
          },
        },
      ],
    });
    al.present();
  }

  // --- Helpers ---

  logout() {
    this.auth.logout();
  }

  private async toastMsg(message: string) {
    const t = await this.toast.create({ message, duration: 1800, position: 'bottom', color: 'dark' });
    t.present();
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = { free: 'Libre', occupied: 'Ocupada', cleaning: 'Por limpiar', reserved: 'Reservada' };
    return m[s] ?? s;
  }
}
