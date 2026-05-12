import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api';
import { Buffet, Session } from '../models';

@Injectable({ providedIn: 'root' })
export class BuffetService {
  constructor(private api: ApiService) {}

  getAll(): Observable<Buffet[]> {
    return this.api.get<Buffet[]>('/buffets');
  }

  choose(sessionId: string, buffetId: string): Observable<Session> {
    return this.api.patch<Session>(`/sessions/${sessionId}/buffet`, { buffetId });
  }
}
