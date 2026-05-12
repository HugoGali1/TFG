import { Component, OnInit } from '@angular/core';
import { SessionService } from '../../services/session';
import { ApiService } from '../../services/api';

@Component({ standalone: false, selector: 'app-payment-success', templateUrl: './payment-success.page.html', styleUrls: ['./payment-success.page.scss'] })
export class PaymentSuccessPage implements OnInit {
  rating = 0;
  comment = '';
  submitted = false;
  sending = false;
  now = new Date();
  private sessionId: string | null = null;

  constructor(
    private sessionService: SessionService,
    private api: ApiService,
  ) {}

  ngOnInit() {
    this.sessionId = this.sessionService.sessionId;
    this.sessionService.clear();
  }

  setRating(r: number) {
    if (this.submitted) return;
    this.rating = r;
  }

  submitFeedback() {
    if (this.submitted || this.sending || !this.rating || !this.sessionId) return;
    this.sending = true;
    this.api.post('/feedback', {
      sessionId: this.sessionId,
      rating: this.rating,
      comment: this.comment.trim() || undefined,
    }).subscribe({
      next: () => {
        this.submitted = true;
        this.sending = false;
      },
      error: () => { this.sending = false; },
    });
  }

  get emojis() { return ['😞','😐','🙂','😍','🔥']; }
}
