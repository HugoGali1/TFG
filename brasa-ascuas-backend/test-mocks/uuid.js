// Mock simple de uuid para tests. Evita el problema de ESM cuando Jest
// intenta parsear el paquete real.
let counter = 0;
module.exports = {
  v4: () => `mock-uuid-${++counter}`,
};
