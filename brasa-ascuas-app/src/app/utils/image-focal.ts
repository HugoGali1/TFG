const OVERRIDES: Record<string, string> = {
  // Las nuevas imágenes están centradas con margen interno; añadir aquí solo
  // si alguna sigue descentrada en pantalla.
};

export function imageFocal(url?: string): string {
  if (!url) return 'center';
  const fname = url.split('/').pop()?.toLowerCase() ?? '';
  return OVERRIDES[fname] ?? 'center';
}
