import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuService } from '../../services/menu';
import { CartService } from '../../services/cart';
import { SessionService } from '../../services/session';
import { Category, MenuItem } from '../../models';
import { imageFocal } from '../../utils/image-focal';
import { LangService } from '../../services/lang';

const CAT_STYLES: Record<string, { bg: string }> = {
  '🔥': { bg: 'linear-gradient(145deg, #c04219, #f0673a)' },
  '🥗': { bg: 'linear-gradient(145deg, #2d5a1b, #5b8a30)' },
  '🦞': { bg: 'linear-gradient(145deg, #0e3a5a, #1a6a9b)' },
  '🍮': { bg: 'linear-gradient(145deg, #6b3a0a, #c89b4a)' },
  '🍷': { bg: 'linear-gradient(145deg, #4a1a2a, #8a3a5a)' },
};

@Component({ standalone: false, selector: 'app-menu', templateUrl: './menu.page.html', styleUrls: ['./menu.page.scss'] })
export class MenuPage implements OnInit {
  categories: Category[] = [];
  items: MenuItem[] = [];
  filteredItems: MenuItem[] = [];
  selectedCategory = '';
  searchText = '';
  activeFilter = '';

  constructor(
    private menuService: MenuService,
    public cartService: CartService,
    public sessionService: SessionService,
    public router: Router,
    public lang: LangService,
  ) {}

  ngOnInit() {
    this.menuService.getCategories().subscribe(cats => {
      this.categories = cats;
      if (cats.length) {
        const initial = this.preferredCategory(cats) ?? cats[0];
        this.selectCategory(initial._id);
      }
    });
  }

  /** Si el buffet activo tiene un icono que coincide con alguna categoría
   *  (Brasa 🔥 → A la brasa, Mar 🦞 → Del Mar), arrancamos en esa pestaña. */
  private preferredCategory(cats: Category[]): Category | null {
    const buffet = this.sessionService.current?.buffet;
    if (!buffet?.icon) return null;
    return cats.find(c => c.icon === buffet.icon) ?? null;
  }

  selectCategory(id: string) {
    this.selectedCategory = id;
    this.activeFilter = '';
    this.searchText = '';
    this.menuService.getItems({ categoryId: id }).subscribe(items => {
      this.items = items;
      this.applyFilter();
    });
  }

  onSearch(event: Event) {
    this.searchText = (event as CustomEvent).detail.value ?? '';
    this.applyFilter();
  }

  setFilter(f: string) {
    this.activeFilter = this.activeFilter === f ? '' : f;
    this.applyFilter();
  }

  applyFilter() {
    let res = [...this.items];
    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      res = res.filter(i => i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q));
    }
    if (this.activeFilter === 'veg')    res = res.filter(i => i.isVegetarian);
    if (this.activeFilter === 'gluten') res = res.filter(i => i.isGlutenFree);
    if (this.activeFilter === 'spicy')  res = res.filter(i => i.isSpicy);
    this.filteredItems = res;
  }

  get categoryStyle(): { bg: string; emoji: string } {
    const cat = this.categories.find(c => c._id === this.selectedCategory);
    const icon = cat?.icon ?? '';
    return { bg: CAT_STYLES[icon]?.bg ?? 'linear-gradient(145deg, #2a1a10, #4a2a1a)', emoji: icon };
  }

  catBgFor(cat: Category): string {
    const styles: Record<string, string> = {
      '🔥': 'linear-gradient(135deg, #c04219, #f0673a)',
      '🥗': 'linear-gradient(135deg, #2d5a1b, #5b8a30)',
      '🦞': 'linear-gradient(135deg, #0e3a5a, #1a6a9b)',
      '🍮': 'linear-gradient(135deg, #6b3a0a, #c89b4a)',
      '🍷': 'linear-gradient(135deg, #4a1a2a, #8a3a5a)',
    };
    return styles[cat.icon ?? ''] ?? 'linear-gradient(135deg, #2a1a10, #4a2a1a)';
  }

  openDetail(item: MenuItem) {
    const s = this.categoryStyle;
    this.router.navigate(['/dish-detail', item._id], { state: { catBg: s.bg, catEmoji: s.emoji } });
  }

  goToCart() { this.router.navigateByUrl('/cart'); }

  imageFocal = imageFocal;

  isCovered(item: MenuItem): boolean {
    const buffet = this.sessionService.current?.buffet;
    if (!buffet) return false;
    const catId = typeof item.category === 'object' ? item.category._id : item.category;
    return buffet.includedCategories.some(c => (typeof c === 'object' ? c._id : c) === catId);
  }
}
