import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, tap } from 'rxjs';
import { ApiService } from './api';
import { LoginResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<LoginResponse['user'] | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(private api: ApiService, private router: Router) {
    const stored = localStorage.getItem('staff_user');
    if (stored) this.userSubject.next(JSON.parse(stored));
  }

  login(email: string, password: string) {
    return this.api.post<LoginResponse>('/auth/login', { email, password }).pipe(
      tap((res) => {
        localStorage.setItem('access_token', res.access_token);
        localStorage.setItem('staff_user', JSON.stringify(res.user));
        this.userSubject.next(res.user);
      }),
    );
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('staff_user');
    this.userSubject.next(null);
    this.router.navigateByUrl('/login');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getRole(): string | null {
    return this.userSubject.value?.role ?? null;
  }
}
