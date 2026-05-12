import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { Subscription } from 'rxjs';
import { LangService } from '../services/lang';

/**
 * Pipe `tField` para campos de BBDD que tienen versión EN: `name`/`nameEn`,
 * `description`/`descriptionEn`, etc. Si la versión inglesa no existe, cae al ES.
 *   {{ item | tField:'name' }}
 *   {{ item | tField:'description' }}
 */
@Pipe({ name: 'tField', pure: false, standalone: false })
export class TranslateFieldPipe implements PipeTransform, OnDestroy {
  private sub?: Subscription;

  constructor(private lang: LangService, private cdr: ChangeDetectorRef) {
    this.sub = this.lang.lang$.subscribe(() => this.cdr.markForCheck());
  }

  transform(obj: unknown, field: string): string {
    if (!obj || typeof obj !== 'object') return '';
    const o = obj as Record<string, unknown>;
    if (this.lang.current === 'en') {
      const enField = field + 'En';
      const enValue = o[enField];
      if (typeof enValue === 'string' && enValue.trim()) return enValue;
    }
    const value = o[field];
    return typeof value === 'string' ? value : '';
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}
