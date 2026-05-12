import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { Session } from './schemas/session.schema';
import { TablesService } from '../tables/tables.service';
import { BuffetService } from '../buffet/buffet.service';

describe('SessionsService.chooseBuffet', () => {
  let service: SessionsService;

  const tablesService = { findById: jest.fn(), updateStatus: jest.fn(), forceFree: jest.fn() };
  const buffetService = { findById: jest.fn() };

  // Mock model: instancia editable con .save() + estáticos como findById
  const sessionModelMock: any = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: getModelToken(Session.name), useValue: sessionModelMock },
        { provide: TablesService, useValue: tablesService },
        { provide: BuffetService, useValue: buffetService },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  const mockBuffet = (price: number) => ({
    _id: 'buffet1',
    name: 'Buffet Brasa',
    pricePerPerson: price,
  });

  const mockSession = (overrides: Partial<any> = {}) => {
    const session: any = {
      _id: 'session1',
      partySize: 4,
      totalAmount: 0,
      buffet: null,
      table: 'table1',
      ...overrides,
    };
    session.save = jest.fn().mockResolvedValue(session);
    return session;
  };

  it('al elegir buffet, totalAmount = pricePerPerson × partySize', async () => {
    const session = mockSession({ partySize: 4, totalAmount: 0 });
    buffetService.findById.mockResolvedValue(mockBuffet(49));
    sessionModelMock.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(session),
    });
    // Spy de this.findById (el método final que devuelve la sesión populada)
    jest.spyOn(service, 'findById').mockResolvedValue({ ...session, totalAmount: 196 } as any);

    await service.chooseBuffet('session1', 'buffet1');

    expect(session.totalAmount).toBe(196); // 49 × 4
    expect(session.save).toHaveBeenCalled();
  });

  it('si la sesión ya tiene buffet, lanza BadRequestException', async () => {
    const session = mockSession({ buffet: 'someBuffet' });
    buffetService.findById.mockResolvedValue(mockBuffet(49));
    sessionModelMock.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(session),
    });

    await expect(service.chooseBuffet('session1', 'buffet1')).rejects.toThrow(BadRequestException);
    expect(session.save).not.toHaveBeenCalled();
  });

  it('si la sesión no existe, lanza NotFoundException', async () => {
    buffetService.findById.mockResolvedValue(mockBuffet(49));
    sessionModelMock.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(service.chooseBuffet('inexistente', 'buffet1')).rejects.toThrow(NotFoundException);
  });

  it('partySize de 2 con buffet de 35€ resulta en totalAmount=70€', async () => {
    const session = mockSession({ partySize: 2, totalAmount: 0 });
    buffetService.findById.mockResolvedValue(mockBuffet(35));
    sessionModelMock.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(session),
    });
    jest.spyOn(service, 'findById').mockResolvedValue({ ...session, totalAmount: 70 } as any);

    await service.chooseBuffet('session1', 'buffet1');

    expect(session.totalAmount).toBe(70); // 35 × 2
  });
});
