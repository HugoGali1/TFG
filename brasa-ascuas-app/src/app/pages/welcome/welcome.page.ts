import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../services/session';
import { SocketService } from '../../services/socket';

@Component({ standalone: false, selector: 'app-welcome', templateUrl: './welcome.page.html', styleUrls: ['./welcome.page.scss'] })
export class WelcomePage implements OnInit {
  session$ = this.sessionService.session$;
  loading = true;
  error = '';
  now = new Date();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sessionService: SessionService,
    private socket: SocketService,
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token') || this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.sessionService.loadByToken(token).subscribe({
        next: (session) => {
          this.loading = false;
          this.socket.joinSession(session._id);
        },
        error: () => { this.loading = false; this.error = 'Mesa no encontrada o sesión expirada.'; }
      });
    } else if (this.sessionService.current) {
      this.loading = false;
      this.socket.joinSession(this.sessionService.current._id);
    } else {
      this.loading = false;
      this.error = 'Escanea el código QR de tu mesa para continuar.';
    }
  }

  start() {
    const session = this.sessionService.current;
    this.router.navigateByUrl(session?.buffet ? '/menu' : '/choose-buffet');
  }
}
