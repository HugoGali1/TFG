import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuService } from '../../services/menu';
import { CartService } from '../../services/cart';
import { MenuItem } from '../../models';
import { ToastController } from '@ionic/angular';
import { imageFocal } from '../../utils/image-focal';
import { SessionService } from '../../services/session';
import { LangService } from '../../services/lang';

@Component({ standalone: false, selector: 'app-dish-detail', templateUrl: './dish-detail.page.html', styleUrls: ['./dish-detail.page.scss'] })
export class DishDetailPage implements OnInit {
  item: MenuItem | null = null;
  selectedLevel = '';
  notes = '';
  quantity = 1;
  catBg  = (history.state?.catBg  as string) || 'linear-gradient(145deg, #c04219, #1a1410)';
  catEmoji = (history.state?.catEmoji as string) || '🍽';

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private menuService: MenuService,
    private cartService: CartService,
    private toast: ToastController,
    public sessionService: SessionService,
    public lang: LangService,
  ) {}

  get isCovered(): boolean {
    const buffet = this.sessionService.current?.buffet;
    if (!buffet || !this.item) return false;
    const catId = typeof this.item.category === 'object' ? this.item.category._id : this.item.category;
    return buffet.includedCategories.some(c => (typeof c === 'object' ? c._id : c) === catId);
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.menuService.getItem(id).subscribe(item => {
      this.item = item;
      if (item.cookingLevels?.length) this.selectedLevel = item.cookingLevels[1] || item.cookingLevels[0];
    });
  }

  levelLabel(level: string): string {
    return this.lang.t('dd.level.' + level);
  }

  changeQty(delta: number) { this.quantity = Math.max(1, this.quantity + delta); }

  imageFocal = imageFocal;

  async addToCart() {
    if (!this.item) return;
    this.cartService.add(this.item, this.quantity, this.selectedLevel || undefined, this.notes || undefined);
    const name = this.lang.current === 'en' ? (this.item.nameEn || this.item.name) : this.item.name;
    const msg = this.lang.current === 'en' ? `${name} added to order` : `${name} añadido al pedido`;
    const t = await this.toast.create({ message: msg, duration: 1800, color: 'dark', position: 'bottom' });
    await t.present();
    this.router.navigateByUrl('/menu');
  }
}
