import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api';
import { Category, MenuItem } from '../models';

@Injectable({ providedIn: 'root' })
export class MenuService {
  constructor(private api: ApiService) {}

  getCategories(): Observable<Category[]> {
    return this.api.get<Category[]>('/menu/categories');
  }

  getItems(filters?: { categoryId?: string; search?: string; isVegetarian?: boolean; isGlutenFree?: boolean; isSpicy?: boolean }): Observable<MenuItem[]> {
    const params: Record<string, string> = {};
    if (filters?.categoryId) params['categoryId'] = filters.categoryId;
    if (filters?.search) params['search'] = filters.search;
    if (filters?.isVegetarian) params['isVegetarian'] = 'true';
    if (filters?.isGlutenFree) params['isGlutenFree'] = 'true';
    if (filters?.isSpicy) params['isSpicy'] = 'true';
    return this.api.get<MenuItem[]>('/menu/items', params);
  }

  getItem(id: string): Observable<MenuItem> {
    return this.api.get<MenuItem>(`/menu/items/${id}`);
  }

  toggleAvailability(id: string): Observable<MenuItem> {
    return this.api.patch<MenuItem>(`/menu/items/${id}/toggle`, {});
  }
}
