import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api';

export interface WaiterRequest {
  _id: string; session: string; table: { number: number; zone: string };
  type: string; message?: string; status: string; createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class WaiterService {
  constructor(private api: ApiService) {}

  request(sessionId: string, type: string, message?: string): Observable<WaiterRequest> {
    return this.api.post<WaiterRequest>('/waiter-requests', { sessionId, type, message });
  }

  getPending(): Observable<WaiterRequest[]> {
    return this.api.get<WaiterRequest[]>('/waiter-requests/pending');
  }

  acknowledge(id: string): Observable<WaiterRequest> {
    return this.api.patch<WaiterRequest>(`/waiter-requests/${id}/acknowledge`, {});
  }

  resolve(id: string): Observable<WaiterRequest> {
    return this.api.patch<WaiterRequest>(`/waiter-requests/${id}/resolve`, {});
  }
}
