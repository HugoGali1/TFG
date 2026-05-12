import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from './schemas/order.schema';
import { SessionsService } from '../sessions/sessions.service';
import { MenuService } from '../menu/menu.service';
import { EventsGateway } from '../gateway/events.gateway';

describe('OrdersService.create', () => {
  let service: OrdersService;
  let capturedOrderData: any;

  const sessionsService = { findById: jest.fn(), addAmount: jest.fn() };
  const menuService = { findItemById: jest.fn() };
  const eventsGateway = { emitNewOrder: jest.fn() };

  // Mock del constructor de Mongoose: captura los datos pasados a `new orderModel(...)`
  // y mockea `.save()`.
  const orderModelMock: any = jest.fn().mockImplementation(function (this: any, data: any) {
    capturedOrderData = data;
    this._data = data;
    this.save = jest.fn().mockResolvedValue({ ...data, _id: 'order_id_1' });
    return this;
  });
  // Para `findById(saved._id).populate(...).populate(...).exec()`
  orderModelMock.findById = jest.fn(() => ({
    populate: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue({ _id: 'order_id_1', items: [] }),
  }));

  beforeEach(async () => {
    capturedOrderData = null;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: orderModelMock },
        { provide: SessionsService, useValue: sessionsService },
        { provide: MenuService, useValue: menuService },
        { provide: EventsGateway, useValue: eventsGateway },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  // Helpers
  const mockSession = (buffet: any = null) => ({
    _id: 'session1',
    partySize: 2,
    roundCount: 0,
    table: 'table1',
    buffet,
  });

  const mockItem = (overrides: Partial<any> = {}) => ({
    _id: 'item1',
    name: 'Chuletón de buey',
    price: 28.5,
    cookingTimeMinutes: 14,
    isAvailable: true,
    category: { _id: 'cat_brasa' },
    ...overrides,
  });

  it('items cubiertos por el buffet llevan linePrice=0 y coveredByBuffet=true', async () => {
    const buffet = { includedCategories: [{ _id: 'cat_brasa' }] };
    sessionsService.findById.mockResolvedValue(mockSession(buffet));
    menuService.findItemById.mockResolvedValue(mockItem());

    await service.create({
      sessionId: 'session1',
      items: [{ menuItemId: 'item1', quantity: 2 }],
    });

    const item = capturedOrderData.items[0];
    expect(item.linePrice).toBe(0);
    expect(item.coveredByBuffet).toBe(true);
    expect(item.unitPrice).toBe(28.5);
    expect(capturedOrderData.totalAmount).toBe(0);
  });

  it('items NO cubiertos por el buffet llevan linePrice = price × quantity', async () => {
    // Buffet del Mar (no incluye categoría brasa)
    const buffet = { includedCategories: [{ _id: 'cat_mar' }] };
    sessionsService.findById.mockResolvedValue(mockSession(buffet));
    menuService.findItemById.mockResolvedValue(mockItem()); // chuletón categoría brasa

    await service.create({
      sessionId: 'session1',
      items: [{ menuItemId: 'item1', quantity: 2 }],
    });

    const item = capturedOrderData.items[0];
    expect(item.linePrice).toBe(57); // 28.5 × 2
    expect(item.coveredByBuffet).toBe(false);
    expect(capturedOrderData.totalAmount).toBe(57);
  });

  it('totalAmount es la suma SOLO de los extras (cubiertos no suman)', async () => {
    // Buffet Brasa: incluye brasa pero no mar
    const buffet = { includedCategories: [{ _id: 'cat_brasa' }] };
    sessionsService.findById.mockResolvedValue(mockSession(buffet));

    const chuleton = mockItem({ _id: 'chuleton', name: 'Chuletón', price: 28.5 });
    const pulpo = mockItem({ _id: 'pulpo', name: 'Pulpo', price: 24, category: { _id: 'cat_mar' } });

    menuService.findItemById
      .mockResolvedValueOnce(chuleton)
      .mockResolvedValueOnce(pulpo);

    await service.create({
      sessionId: 'session1',
      items: [
        { menuItemId: 'chuleton', quantity: 1 },
        { menuItemId: 'pulpo', quantity: 1 },
      ],
    });

    expect(capturedOrderData.items[0].linePrice).toBe(0);   // chuletón cubierto
    expect(capturedOrderData.items[1].linePrice).toBe(24);  // pulpo extra
    expect(capturedOrderData.totalAmount).toBe(24);          // solo extras
  });

  it('sin buffet, todos los items se cobran', async () => {
    sessionsService.findById.mockResolvedValue(mockSession(null));
    menuService.findItemById.mockResolvedValue(mockItem({ price: 18 }));

    await service.create({
      sessionId: 'session1',
      items: [{ menuItemId: 'item1', quantity: 3 }],
    });

    expect(capturedOrderData.items[0].linePrice).toBe(54); // 18 × 3
    expect(capturedOrderData.items[0].coveredByBuffet).toBe(false);
    expect(capturedOrderData.totalAmount).toBe(54);
  });

  it('lanza BadRequestException si un item no está disponible', async () => {
    sessionsService.findById.mockResolvedValue(mockSession(null));
    menuService.findItemById.mockResolvedValue(mockItem({ isAvailable: false }));

    await expect(
      service.create({
        sessionId: 'session1',
        items: [{ menuItemId: 'item1', quantity: 1 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
