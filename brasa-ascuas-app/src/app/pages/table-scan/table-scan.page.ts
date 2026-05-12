import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { SessionService } from '../../services/session';
import { ApiService } from '../../services/api';
import { Table } from '../../models';

@Component({ standalone: false, selector: 'app-table-scan', templateUrl: './table-scan.page.html', styleUrls: ['./table-scan.page.scss'] })
export class TableScanPage implements OnInit {
  qrCode = '';
  table: Table | null = null;
  partySize = 2;
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sessionService: SessionService,
    private api: ApiService,
    private loadingCtrl: LoadingController,
  ) {}

  ngOnInit() {
    this.qrCode = this.route.snapshot.paramMap.get('qrCode') ?? '';
    if (!this.qrCode) {
      this.error = 'QR inválido';
      this.loading = false;
      return;
    }

    this.api.get<Table>(`/tables/qr/${this.qrCode}`).subscribe({
      next: (table) => {
        this.table = table;
        this.sessionService.loadActiveByTableQr(this.qrCode).subscribe({
          next: (session) => {
            this.loading = false;
            if (session) this.router.navigateByUrl('/welcome');
          },
          error: () => { this.loading = false; },
        });
      },
      error: () => {
        this.loading = false;
        this.error = 'Esta mesa no existe o el QR no es válido.';
      },
    });
  }

  changeParty(delta: number) {
    const max = this.table?.capacity ?? 8;
    this.partySize = Math.max(1, Math.min(max, this.partySize + delta));
  }

  async start() {
    if (!this.table) return;
    const loader = await this.loadingCtrl.create({ message: 'Abriendo mesa…' });
    await loader.present();
    this.sessionService.createFromQr(this.qrCode, this.partySize).subscribe({
      next: () => {
        loader.dismiss();
        this.router.navigateByUrl('/welcome');
      },
      error: () => loader.dismiss(),
    });
  }
}
