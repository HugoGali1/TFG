import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { BuffetService } from '../../services/buffet';
import { SessionService } from '../../services/session';
import { Buffet, Category } from '../../models';
import { LangService } from '../../services/lang';

@Component({ standalone: false, selector: 'app-choose-buffet', templateUrl: './choose-buffet.page.html', styleUrls: ['./choose-buffet.page.scss'] })
export class ChooseBuffetPage implements OnInit {
  buffets: Buffet[] = [];
  selected: string | null = null;

  constructor(
    private buffetService: BuffetService,
    public sessionService: SessionService,
    private router: Router,
    private loading: LoadingController,
    public lang: LangService,
  ) {}

  ngOnInit() {
    this.buffetService.getAll().subscribe(bs => { this.buffets = bs; });
  }

  totalFor(buffet: Buffet): number {
    const size = this.sessionService.current?.partySize ?? 1;
    return Math.round(buffet.pricePerPerson * size * 100) / 100;
  }

  catList(buffet: Buffet): string {
    return buffet.includedCategories
      .map(c => typeof c === 'object'
        ? (this.lang.current === 'en' ? ((c as Category).nameEn || c.name) : c.name)
        : c)
      .join(' · ');
  }

  async confirm() {
    if (!this.selected) return;
    const sessionId = this.sessionService.sessionId;
    if (!sessionId) return;
    const loader = await this.loading.create({ message: 'Configurando…' });
    await loader.present();
    this.buffetService.choose(sessionId, this.selected).subscribe({
      next: (session) => {
        loader.dismiss();
        this.sessionService.update(session);
        this.router.navigateByUrl('/menu');
      },
      error: () => loader.dismiss(),
    });
  }
}
