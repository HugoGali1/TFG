import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Order } from '../../models';

@Component({ standalone: false, selector: 'app-order-confirmation', templateUrl: './order-confirmation.page.html', styleUrls: ['./order-confirmation.page.scss'] })
export class OrderConfirmationPage implements OnInit {
  order: Order | null = null;
  eta = 0;

  constructor(private router: Router) {}

  ngOnInit() {
    const state = history.state;
    if (state?.order) {
      this.order = state.order;
      this.eta = this.order?.items.reduce((max, i) => Math.max(max, i.estimatedMinutes ?? 0), 0) ?? 14;
    }
  }

  viewStatus() { this.router.navigate(['/order-status'], { state: { order: this.order } }); }
  orderMore() { this.router.navigateByUrl('/menu'); }
}
