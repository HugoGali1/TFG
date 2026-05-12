import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { Subscription } from 'rxjs';
import { LangService } from '../services/lang';

/**
 * Pipe `t` para etiquetas estáticas. Reactivo al cambio de idioma.
 *   {{ 'menu.title' | t }}
 */
@Pipe({ name: 't', pure: false, standalone: false })
export class TranslatePipe implements PipeTransform, OnDestroy {
  private sub?: Subscription;
  private lastValue = '';
  private lastKey = '';

  constructor(private lang: LangService, private cdr: ChangeDetectorRef) {
    this.sub = this.lang.lang$.subscribe(() => {
      // Forzamos re-render cuando cambia el idioma; el pipe se re-evaluará.
      this.lastKey = '';
      this.cdr.markForCheck();
    });
  }

  transform(key: string): string {
    if (key === this.lastKey) return this.lastValue;
    this.lastKey = key;
    this.lastValue = this.lang.t(key);
    return this.lastValue;
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}
