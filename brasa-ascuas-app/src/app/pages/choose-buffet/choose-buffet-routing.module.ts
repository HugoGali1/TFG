import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ChooseBuffetPage } from './choose-buffet.page';

const routes: Routes = [{ path: '', component: ChooseBuffetPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ChooseBuffetPageRoutingModule {}
