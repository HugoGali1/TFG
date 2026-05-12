import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CartItem, MenuItem } from '../models';

@Injectable({ providedIn: 'root' })
export class CartService {
  private itemsSubject = new BehaviorSubject<CartItem[]>([]);
  items$ = this.itemsSubject.asObservable();

  get items(): CartItem[] { return this.itemsSubject.value; }
  get count(): number { return this.items.reduce((s, i) => s + i.quantity, 0); }
  get total(): number {
    return Math.round(this.items.reduce((s, i) => s + i.menuItem.price * i.quantity, 0) * 100) / 100;
  }

  add(menuItem: MenuItem, quantity = 1, cookingLevel?: string, notes?: string) {
    const current = [...this.items];
    const idx = current.findIndex(i => i.menuItem._id === menuItem._id && i.cookingLevel === cookingLevel);
    if (idx >= 0) {
      current[idx] = { ...current[idx], quantity: current[idx].quantity + quantity };
    } else {
      current.push({ menuItem, quantity, cookingLevel, notes });
    }
    this.itemsSubject.next(current);
  }

  updateQuantity(index: number, quantity: number) {
    const current = [...this.items];
    if (quantity <= 0) { current.splice(index, 1); } else { current[index] = { ...current[index], quantity }; }
    this.itemsSubject.next(current);
  }

  remove(index: number) {
    const current = [...this.items];
    current.splice(index, 1);
    this.itemsSubject.next(current);
  }

  clear() { this.itemsSubject.next([]); }
}
