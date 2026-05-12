import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ChooseBuffetPageRoutingModule } from './choose-buffet-routing.module';
import { ChooseBuffetPage } from './choose-buffet.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, ChooseBuffetPageRoutingModule, SharedModule],
  declarations: [ChooseBuffetPage],
})
export class ChooseBuffetPageModule {}
