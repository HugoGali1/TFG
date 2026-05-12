import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Lang = 'es' | 'en';

const KEY = 'brasa_lang';

const TRANSLATIONS: Record<string, { es: string; en: string }> = {
  // common
  'common.back':              { es: 'Volver',          en: 'Back' },
  'common.cancel':            { es: 'Cancelar',        en: 'Cancel' },
  'common.save':              { es: 'Guardar',         en: 'Save' },
  'common.included':          { es: 'Incluido',        en: 'Included' },
  'common.optional':          { es: '(opcional)',      en: '(optional)' },
  'common.persons':           { es: 'personas',        en: 'people' },
  'common.person':            { es: 'persona',         en: 'person' },

  // menu
  'menu.title':               { es: 'La carta',                          en: 'Menu' },
  'menu.tagline':             { es: 'Brasa & Ascuas — cocina al fuego',  en: 'Brasa & Ascuas — fire cuisine' },
  'menu.search':              { es: 'Buscar plato, ingrediente…',        en: 'Search dish, ingredient…' },
  'menu.assistance':          { es: 'Asistencia',                        en: 'Assistance' },
  'menu.status':              { es: 'Estado',                            en: 'Status' },
  'menu.bill':                { es: 'Cuenta',                            en: 'Bill' },
  'menu.veg':                 { es: 'Vegetariano',                       en: 'Vegetarian' },
  'menu.gluten_free':         { es: 'Sin gluten',                        en: 'Gluten-free' },
  'menu.spicy':               { es: 'Picante',                           en: 'Spicy' },
  'menu.empty_filter':        { es: 'No hay platos con ese filtro',      en: 'No dishes match this filter' },
  'menu.cooktime_now':        { es: 'Al momento',                        en: 'Instant' },
  'menu.cart_view':           { es: 'Ver mi pedido',                     en: 'View order' },
  'menu.round':               { es: 'Ronda',                             en: 'Round' },
  'menu.table':               { es: 'Mesa',                              en: 'Table' },

  // choose-buffet
  'cb.experience':            { es: 'Elige tu experiencia',                                 en: 'Choose your experience' },
  'cb.title':                 { es: 'Buffet libre',                                         en: 'All-you-can-eat buffet' },
  'cb.subtitle':              { es: 'Pide sin límite. Un único pago al final.',             en: 'Order without limits. Single payment at the end.' },
  'cb.start':                 { es: 'Empezar a pedir',                                      en: 'Start ordering' },
  'cb.fineprint':             { es: 'Una vez confirmado, el buffet no se puede cambiar.',   en: 'Once confirmed, the buffet cannot be changed.' },
  'cb.per_person':            { es: '/pers.',                                               en: '/person' },
  'cb.total':                 { es: 'Total',                                                en: 'Total' },

  // dish-detail
  'dd.recommended':           { es: 'Recomendado',           en: 'Recommended' },
  'dd.cooktime_aprox':        { es: 'min aprox.',            en: 'min approx.' },
  'dd.allergens':             { es: 'Alérgenos',             en: 'Allergens' },
  'dd.cooking_level':         { es: 'Punto de cocción',      en: 'Cooking level' },
  'dd.notes_label':           { es: 'Nota para cocina',      en: 'Note for the kitchen' },
  'dd.notes_placeholder':     { es: 'Sin cebolla, alergia a frutos secos, extra salsa…',  en: 'No onion, nut allergy, extra sauce…' },
  'dd.add_to_order':          { es: 'Añadir al pedido',                en: 'Add to order' },
  'dd.included_in_buffet':    { es: 'Incluido en buffet',              en: 'Included in buffet' },
  'dd.unit':                  { es: '/ ud.',                           en: '/ unit' },
  'dd.level.poco':            { es: 'Poco hecho',     en: 'Rare' },
  'dd.level.medio':           { es: 'Medio',          en: 'Medium' },
  'dd.level.al_punto':        { es: 'Al punto',       en: 'Medium-well' },
  'dd.level.hecho':           { es: 'Bien hecho',     en: 'Well done' },

  // cart
  'cart.title':               { es: 'Tu pedido',                              en: 'Your order' },
  'cart.empty':               { es: 'Tu pedido está vacío',                   en: 'Your order is empty' },
  'cart.see_menu':            { es: 'Ver la carta',                           en: 'See menu' },
  'cart.notes_label':         { es: 'Nota general para cocina',               en: 'General note for the kitchen' },
  'cart.notes_placeholder':   { es: 'Alérgicos, preferencias generales…',     en: 'Allergies, general preferences…' },
  'cart.subtotal':            { es: 'Subtotal',                               en: 'Subtotal' },
  'cart.total_estimated':     { es: 'Total estimado',                         en: 'Estimated total' },
  'cart.this_round':          { es: 'Esta ronda',                             en: 'This round' },
  'cart.send_to_kitchen':     { es: 'Enviar a cocina',                        en: 'Send to kitchen' },
  'cart.add_more_later':      { es: 'Podrás añadir más platos después',       en: 'You can add more dishes later' },
  'cart.dishes_no_cost':      { es: 'platos sin coste',                       en: 'dishes at no extra cost' },
  'cart.extras':              { es: 'Extras',                                 en: 'Extras' },
};

@Injectable({ providedIn: 'root' })
export class LangService {
  private subject = new BehaviorSubject<Lang>(this.getStored());
  lang$ = this.subject.asObservable();

  get current(): Lang { return this.subject.value; }

  /** Path al SVG de la bandera del idioma al que se cambiará (acción). */
  get toggleFlagSrc(): string {
    return this.current === 'es' ? 'assets/flags/gb.svg' : 'assets/flags/es.svg';
  }

  set(lang: Lang) {
    localStorage.setItem(KEY, lang);
    this.subject.next(lang);
  }

  toggle() {
    this.set(this.current === 'es' ? 'en' : 'es');
  }

  /** Devuelve la traducción de una clave estática. Si no existe, devuelve la clave. */
  t(key: string): string {
    const entry = TRANSLATIONS[key];
    if (!entry) return key;
    return entry[this.current] ?? entry.es;
  }

  private getStored(): Lang {
    const v = localStorage.getItem(KEY);
    return v === 'en' ? 'en' : 'es';
  }
}
