/**
 * Script de seed para poblar la base de datos con datos iniciales.
 * Uso: npm run seed
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { TablesService } from './tables/tables.service';
import { MenuService } from './menu/menu.service';
import { BuffetService } from './buffet/buffet.service';
import { Role } from './users/enums/role.enum';
import { TableZone } from './tables/schemas/table.schema';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);
  const tablesService = app.get(TablesService);
  const menuService = app.get(MenuService);
  const buffetService = app.get(BuffetService);

  console.log('Seeding usuarios...');
  await usersService.create({ email: 'admin@brasaascuas.es', name: 'Admin', password: 'admin1234', role: Role.ADMIN }).catch(() => {});
  await usersService.create({ email: 'cocina@brasaascuas.es', name: 'Cocina', password: 'cocina1234', role: Role.KITCHEN }).catch(() => {});
  await usersService.create({ email: 'marta@brasaascuas.es', name: 'Marta García', password: 'marta1234', role: Role.WAITER }).catch(() => {});

  console.log('Seeding mesas...');
  const tableData = [
    { number: 1, zone: TableZone.INTERIOR, capacity: 2 },
    { number: 2, zone: TableZone.INTERIOR, capacity: 4 },
    { number: 5, zone: TableZone.TERRAZA, capacity: 4 },
    { number: 14, zone: TableZone.TERRAZA, capacity: 2 },
    { number: 20, zone: TableZone.PRIVADO, capacity: 8 },
  ];
  for (const t of tableData) {
    await tablesService.create(t).catch(() => {});
  }

  console.log('Seeding categorías...');
  const existingCats = await menuService.findAllCategories();
  const ensureCategory = async (data: { name: string; nameEn: string; icon: string; order: number }) => {
    const found = existingCats.find((c) => c.name === data.name);
    if (found) return found;
    const created = await menuService.createCategory(data);
    existingCats.push(created);
    return created;
  };

  const brasa = await ensureCategory({ name: 'A la brasa', nameEn: 'From the Grill', icon: '🔥', order: 0 });
  const entrantes = await ensureCategory({ name: 'Entrantes', nameEn: 'Starters', icon: '🥗', order: 1 });
  const mar = await ensureCategory({ name: 'Del Mar', nameEn: 'From the Sea', icon: '🦞', order: 2 });
  const postres = await ensureCategory({ name: 'Postres', nameEn: 'Desserts', icon: '🍮', order: 3 });
  const bebidas = await ensureCategory({ name: 'Bebidas', nameEn: 'Drinks', icon: '🍷', order: 4 });

  console.log('Seeding platos...');
  const existingItems = await menuService.findAllItems();
  const ensureItem = async (data: any) => {
    if (existingItems.some((i) => i.name === data.name)) return;
    await menuService.createItem(data);
  };

  await ensureItem({ name: 'Chuletón de buey', nameEn: 'Aged ribeye', description: 'Chuletón de buey con maduración de 40 días, servido en tabla de madera', category: brasa._id.toString(), price: 28.5, cookingTimeMinutes: 14, tags: ['TOP'], allergens: [], isGrilled: true, cookingLevels: ['poco', 'medio', 'al_punto', 'hecho'] });
  await ensureItem({ name: 'Picaña a la brasa', nameEn: 'Grilled picanha', description: 'Picaña brasileña a la parrilla con chimichurri casero', category: brasa._id.toString(), price: 22, cookingTimeMinutes: 10, tags: [], isGrilled: true, cookingLevels: ['poco', 'medio', 'al_punto', 'hecho'] });
  await ensureItem({ name: 'Costilla glaseada', nameEn: 'Glazed short rib', description: 'Costilla de cerdo ibérico glaseada con salsa de pimiento y miel', category: brasa._id.toString(), price: 18, cookingTimeMinutes: 12, tags: ['PICANTE'], allergens: [], isSpicy: true, isGrilled: true });
  await ensureItem({ name: 'Pulpo brasero', nameEn: 'Charred octopus', description: 'Pulpo a la brasa con pimentón de La Vera y aceite de oliva virgen', category: mar._id.toString(), price: 24, cookingTimeMinutes: 9, tags: ['SIN GLUTEN'], allergens: [], isGlutenFree: true, isGrilled: true });
  await ensureItem({ name: 'Pan de cristal con tomate', nameEn: 'Crystal bread with tomato', description: 'Pan de cristal artesanal con tomate de temporada y aceite de arbequina', category: entrantes._id.toString(), price: 5, cookingTimeMinutes: 3, tags: [], allergens: ['Gluten'] });
  await ensureItem({ name: 'Croquetas de jamón ibérico', nameEn: 'Iberian ham croquettes', description: 'Croquetas caseras de jamón ibérico D.O. Guijuelo, 6 unidades', category: entrantes._id.toString(), price: 9, cookingTimeMinutes: 8, tags: [], allergens: ['Gluten', 'Lácteos'] });
  await ensureItem({ name: 'Torrija a la brasa', nameEn: 'Grilled French toast', description: 'Torrija caramelizada a la brasa con helado de vainilla de Madagascar', category: postres._id.toString(), price: 7.5, cookingTimeMinutes: 5, tags: [], allergens: ['Gluten', 'Lácteos', 'Huevos'] });
  await ensureItem({ name: 'Vino tinto de la casa', nameEn: 'House red wine', description: 'Ribera del Duero, copa 15cl', category: bebidas._id.toString(), price: 4.5, cookingTimeMinutes: 1, tags: [], allergens: ['Sulfitos'] });
  await ensureItem({ name: 'Agua mineral', nameEn: 'Mineral water', description: 'Agua mineral natural 50cl', category: bebidas._id.toString(), price: 2, cookingTimeMinutes: 0, tags: [], allergens: [], isGlutenFree: true, isVegetarian: true });

  console.log('Seeding buffets...');
  const allCats = await menuService.findAllCategories();
  const findCat = (name: string) => allCats.find((c) => c.name === name)?._id?.toString();
  const brasaId = findCat('A la brasa');
  const marId = findCat('Del Mar');
  const entrantesId = findCat('Entrantes');
  const postresId = findCat('Postres');
  const bebidasId = findCat('Bebidas');

  const existing = await buffetService.findAll();
  const hasBuffet = (name: string) => existing.some((b) => b.name === name);

  if (!hasBuffet('Buffet Brasa') && brasaId && entrantesId && postresId && bebidasId) {
    await buffetService.create({
      name: 'Buffet Brasa',
      nameEn: 'Grill Buffet',
      description: 'Carnes a la brasa, entrantes, postres y bebidas. A discreción.',
      pricePerPerson: 49,
      includedCategories: [brasaId, entrantesId, postresId, bebidasId],
      icon: '🔥',
      order: 0,
    });
  }
  if (!hasBuffet('Buffet del Mar') && marId && entrantesId && postresId && bebidasId) {
    await buffetService.create({
      name: 'Buffet del Mar',
      nameEn: 'Seafood Buffet',
      description: 'Pescados y mariscos, entrantes, postres y bebidas. A discreción.',
      pricePerPerson: 45,
      includedCategories: [marId, entrantesId, postresId, bebidasId],
      icon: '🦞',
      order: 1,
    });
  }
  if (!hasBuffet('Buffet Completo') && brasaId && marId && entrantesId && postresId && bebidasId) {
    await buffetService.create({
      name: 'Buffet Completo',
      nameEn: 'Full Buffet',
      description: 'Brasa, mar, entrantes, postres y bebidas. Sin límites.',
      pricePerPerson: 65,
      includedCategories: [brasaId, marId, entrantesId, postresId, bebidasId],
      icon: '🍽️',
      order: 2,
    });
  }

  console.log('Seed completado');
  await app.close();
}

seed().catch((e) => { console.error(e); process.exit(1); });
