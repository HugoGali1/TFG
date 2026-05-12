import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api';
import { Session } from '../models';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private sessionSubject = new BehaviorSubject<Session | null>(null);
  session$ = this.sessionSubject.asObservable();

  constructor(private api: ApiService) {
    const stored = sessionStorage.getItem('brasa_session');
    if (stored) this.sessionSubject.next(JSON.parse(stored));
  }

  loadByToken(token: string) {
    return this.api.get<Session>(`/sessions/token/${token}`).pipe(
      tap((session) => {
        sessionStorage.setItem('brasa_session', JSON.stringify(session));
        this.sessionSubject.next(session);
      }),
    );
  }

  loadActiveByTableQr(qrCode: string) {
    return this.api.get<Session | null>(`/sessions/active-by-table/${qrCode}`).pipe(
      tap((session) => {
        if (session) {
          sessionStorage.setItem('brasa_session', JSON.stringify(session));
          this.sessionSubject.next(session);
        }
      }),
    );
  }

  createFromQr(qrCode: string, partySize: number) {
    return this.api.post<Session>('/sessions/from-qr', { qrCode, partySize }).pipe(
      tap((session) => {
        sessionStorage.setItem('brasa_session', JSON.stringify(session));
        this.sessionSubject.next(session);
      }),
    );
  }

  get current(): Session | null { return this.sessionSubject.value; }
  get sessionId(): string | null { return this.sessionSubject.value?._id ?? null; }

  update(session: Session) {
    sessionStorage.setItem('brasa_session', JSON.stringify(session));
    this.sessionSubject.next(session);
  }

  clear() {
    sessionStorage.removeItem('brasa_session');
    this.sessionSubject.next(null);
  }
}
