import { NgModule } from '@angular/core';
import { TranslatePipe } from '../pipes/translate.pipe';
import { TranslateFieldPipe } from '../pipes/translate-field.pipe';

@NgModule({
  declarations: [TranslatePipe, TranslateFieldPipe],
  exports: [TranslatePipe, TranslateFieldPipe],
})
export class SharedModule {}
