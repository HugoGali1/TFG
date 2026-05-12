import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CallWaiterPage } from './call-waiter.page';

const routes: Routes = [
  {
    path: '',
    component: CallWaiterPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CallWaiterPageRoutingModule {}
