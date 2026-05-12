import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket;
  private currentSessionId: string | null = null;
  private joinedKitchen = false;
  private joinedWaiters = false;

  constructor() {
    this.socket = io(`${environment.wsUrl}/events`, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
    });

    // Tras una reconexión (red, suspensión móvil, ...) socket.io se reincorpora
    // pero las "rooms" se pierden en el servidor. Las re-emitimos aquí.
    this.socket.on('connect', () => {
      if (this.currentSessionId) this.socket.emit('join-session', this.currentSessionId);
      if (this.joinedKitchen) this.socket.emit('join-kitchen');
      if (this.joinedWaiters) this.socket.emit('join-waiters');
    });
  }

  connect() { if (!this.socket.connected) this.socket.connect(); }
  disconnect() { this.socket.disconnect(); }

  joinSession(sessionId: string) {
    this.currentSessionId = sessionId;
    this.connect();
    this.socket.emit('join-session', sessionId);
  }

  joinKitchen() {
    this.joinedKitchen = true;
    this.connect();
    this.socket.emit('join-kitchen');
  }

  joinWaiters() {
    this.joinedWaiters = true;
    this.connect();
    this.socket.emit('join-waiters');
  }

  on<T>(event: string): Observable<T> {
    return new Observable(observer => {
      this.socket.on(event, (data: T) => observer.next(data));
      return () => this.socket.off(event);
    });
  }
}
