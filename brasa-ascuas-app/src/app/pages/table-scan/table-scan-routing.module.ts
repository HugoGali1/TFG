import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TableScanPage } from './table-scan.page';

const routes: Routes = [{ path: '', component: TableScanPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TableScanPageRoutingModule {}
