import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CallWaiterPageRoutingModule } from './call-waiter-routing.module';

import { CallWaiterPage } from './call-waiter.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CallWaiterPageRoutingModule
  ],
  declarations: [CallWaiterPage]
})
export class CallWaiterPageModule {}
