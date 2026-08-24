// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'http://localhost:3000',

  // Pon la clave publicable de Stripe (pk_test_...) para cobrar de verdad.
  // Si se deja vacía, la pantalla de pago cae automáticamente en la
  // simulacion de /payments/simulate, para poder hacer la demo sin claves.
  stripePublishableKey: '',
};
