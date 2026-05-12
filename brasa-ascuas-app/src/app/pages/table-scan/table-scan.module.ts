import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TableScanPageRoutingModule } from './table-scan-routing.module';
import { TableScanPage } from './table-scan.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, TableScanPageRoutingModule],
  declarations: [TableScanPage],
})
export class TableScanPageModule {}
