import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { buffetGuard } from './guards/buffet.guard';
import { adminGuard } from './guards/admin.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'mesa/:token',
    loadChildren: () => import('./pages/welcome/welcome.module').then( m => m.WelcomePageModule)
  },
  {
    path: 't/:qrCode',
    loadChildren: () => import('./pages/table-scan/table-scan.module').then( m => m.TableScanPageModule)
  },
  {
    path: 'welcome',
    loadChildren: () => import('./pages/welcome/welcome.module').then( m => m.WelcomePageModule)
  },
  {
    path: 'choose-buffet',
    loadChildren: () => import('./pages/choose-buffet/choose-buffet.module').then( m => m.ChooseBuffetPageModule)
  },
  {
    path: 'menu',
    canActivate: [buffetGuard],
    loadChildren: () => import('./pages/menu/menu.module').then( m => m.MenuPageModule)
  },
  {
    path: 'dish-detail',
    loadChildren: () => import('./pages/dish-detail/dish-detail.module').then( m => m.DishDetailPageModule)
  },
  {
    path: 'cart',
    loadChildren: () => import('./pages/cart/cart.module').then( m => m.CartPageModule)
  },
  {
    path: 'order-confirmation',
    loadChildren: () => import('./pages/order-confirmation/order-confirmation.module').then( m => m.OrderConfirmationPageModule)
  },
  {
    path: 'order-status',
    loadChildren: () => import('./pages/order-status/order-status.module').then( m => m.OrderStatusPageModule)
  },
  {
    path: 'order-history',
    loadChildren: () => import('./pages/order-history/order-history.module').then( m => m.OrderHistoryPageModule)
  },
  {
    path: 'call-waiter',
    loadChildren: () => import('./pages/call-waiter/call-waiter.module').then( m => m.CallWaiterPageModule)
  },
  {
    path: 'payment',
    loadChildren: () => import('./pages/payment/payment.module').then( m => m.PaymentPageModule)
  },
  {
    path: 'payment-success',
    loadChildren: () => import('./pages/payment-success/payment-success.module').then( m => m.PaymentSuccessPageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'kitchen',
    canActivate: [authGuard],
    loadChildren: () => import('./pages/kitchen/kitchen.module').then( m => m.KitchenPageModule)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./pages/admin/admin.module').then( m => m.AdminPageModule)
  },
  {
    path: 'dev',
    loadChildren: () => import('./pages/dev/dev.module').then( m => m.DevPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
