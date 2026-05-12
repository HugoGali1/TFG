import { NgModule, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { OrderHistoryPageRoutingModule } from './order-history-routing.module';
import { OrderHistoryPage } from './order-history.page';

@Pipe({ standalone: false, name: 'reverse' })
export class ReversePipe implements PipeTransform {
  transform<T>(value: T[]): T[] { return [...value].reverse(); }
}

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, OrderHistoryPageRoutingModule],
  declarations: [OrderHistoryPage, ReversePipe]
})
export class OrderHistoryPageModule {}
