import { OrderItem, MenuItem, Category } from '../models';

const STATUS_GENERIC: Record<string, string> = {
  pending:   'Pendiente',
  received:  'Recibido',
  cooking:   'Cocinando',
  ready:     'Listo',
  served:    'Servido',
  cancelled: 'Cancelado',
};

const STATUS_GRILLED: Record<string, string> = {
  ...STATUS_GENERIC,
  cooking: 'En brasa',
};

const NEXT_GENERIC: Record<string, string> = {
  received: 'Empezar',
  cooking:  'Marcar listo',
  ready:    'Servido',
};

const NEXT_GRILLED: Record<string, string> = {
  ...NEXT_GENERIC,
  received: 'Poner en brasa',
};

function menuItemOf(item?: OrderItem): MenuItem | undefined {
  if (!item) return undefined;
  return typeof item.menuItem === 'object' ? (item.menuItem as MenuItem) : undefined;
}

function isGrilled(item?: OrderItem): boolean {
  return !!menuItemOf(item)?.isGrilled;
}

export function isDrink(item?: OrderItem): boolean {
  const mi = menuItemOf(item);
  if (!mi) return false;
  const cat = mi.category;
  if (cat && typeof cat === 'object') {
    const c = cat as Category;
    if (c.icon === '🍷') return true;
    if (c.name?.toLowerCase() === 'bebidas') return true;
    if (c.nameEn?.toLowerCase() === 'drinks') return true;
  }
  // Fallback heurístico por si la categoría no llegó populada: bebidas no
  // tienen niveles de cocción ni necesitan tiempo de preparación.
  if ((mi.cookingLevels?.length ?? 0) === 0 && (mi.cookingTimeMinutes ?? 0) <= 1) return true;
  return false;
}

export function statusLabel(status: string, item?: OrderItem): string {
  const map = isGrilled(item) ? STATUS_GRILLED : STATUS_GENERIC;
  return map[status] ?? status;
}

export function statusColorClass(status: string): 'gold' | 'red' | 'green' | 'gray' {
  switch (status) {
    case 'received':  return 'gold';
    case 'cooking':   return 'red';
    case 'ready':     return 'green';
    case 'served':    return 'green';
    default:          return 'gray';
  }
}

/** Acción que aparece en el botón de cocina para pasar al siguiente estado. */
export function nextStatusLabel(status: string, item?: OrderItem): string {
  if (isDrink(item)) {
    return status === 'received' ? 'Servir' : 'Servido';
  }
  const map = isGrilled(item) ? NEXT_GRILLED : NEXT_GENERIC;
  return map[status] ?? 'Siguiente';
}

/** Siguiente estado en la cadena. Bebidas: received → served directo. */
export function nextStatus(status: string, item?: OrderItem): string {
  if (isDrink(item) && status === 'received') return 'served';
  const chain: Record<string, string> = { received: 'cooking', cooking: 'ready', ready: 'served' };
  return chain[status] ?? status;
}
