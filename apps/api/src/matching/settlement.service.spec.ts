import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SettlementService } from './settlement.service';
import { RedisService } from '../common/redis/redis.service';
import { TradeEntity } from './entities/trade.entity';
import { OrderEntity } from './entities/order.entity';
import { AccountEntity } from '../account/entities/account.entity';
import { AccountCashEntity } from '../account/entities/account-cash.entity';
import { AccountCoinEntity } from '../account/entities/account-coin.entity';
import { LockRecordEntity } from '../account/entities/lock-record.entity';
import {
  BusinessException,
  AccountFrozenException,
} from '../common/exceptions/business.exception';

describe('SettlementService', () => {
  let service: SettlementService;
  let mockQueryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: {
      findOne: jest.Mock;
      save: jest.Mock;
      create: jest.Mock;
    };
  };
  let mockDataSource: {
    createQueryRunner: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let mockRedis: { publish: jest.Mock };

  const tradeId = '100';
  const createTrade = (overrides: Partial<TradeEntity> = {}): TradeEntity =>
    ({
      id: tradeId,
      bidOrderId: '1',
      askOrderId: '2',
      bidAccountId: '10',
      askAccountId: '20',
      pairName: 'BTC/USD',
      price: '50000',
      quantity: '1',
      value: '50000',
      settlementStatus: 'PENDING',
      ...overrides,
    }) as TradeEntity;

  const createOrder = (id: string, orderType: string): OrderEntity =>
    ({
      id,
      accountId: id === '1' ? '10' : '20',
      orderType,
      pairName: 'BTC/USD',
      isBid: id === '1',
    }) as OrderEntity;

  const createAccount = (id: string, tradingStatus: string): AccountEntity =>
    ({
      id,
      tradingStatus,
    }) as AccountEntity;

  const createBuyerCoin = (): AccountCoinEntity =>
    ({
      accountId: '10',
      coinName: 'BTC',
      available: '0',
      locked: '0',
      frozen: '0',
      total: '0',
    }) as AccountCoinEntity;

  const createSellerCash = (): AccountCashEntity =>
    ({
      accountId: '20',
      available: '0',
      locked: '50000',
      total: '50000',
    }) as AccountCashEntity;

  const createLock = (
    orderId: string,
    lockType: string,
    assetName: string,
    lockAmount: string,
  ): LockRecordEntity =>
    ({
      orderId,
      accountId: orderId === '1' ? '10' : '20',
      lockType,
      assetName,
      lockAmount,
      status: 'LOCKED',
    }) as LockRecordEntity;

  beforeEach(async () => {
    mockRedis = { publish: jest.fn().mockResolvedValue(undefined) };
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        findOne: jest.fn(),
        save: jest.fn().mockResolvedValue(undefined),
        create: jest.fn((_, dto) => dto),
      },
    };
    const mockQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: RedisService,
          useValue: { getClient: () => mockRedis },
        },
      ],
    }).compile();

    service = module.get<SettlementService>(SettlementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('settleTrade - success', () => {
    it('should confirm trade, update balances, consume locks, create tx records, and publish events', async () => {
      const trade = createTrade();
      const bidOrder = createOrder('1', 'LIMIT');
      const askOrder = createOrder('2', 'LIMIT');
      const bidAccount = createAccount('10', 'ACTIVE');
      const askAccount = createAccount('20', 'ACTIVE');
      const buyerCoin = createBuyerCoin();
      const sellerCash = createSellerCash();
      const buyerLock = createLock('1', 'CASH', 'USD', '50100'); // value + fee
      const sellerLock = createLock('2', 'COIN', 'BTC', '1');

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(trade)
        .mockResolvedValueOnce(bidOrder)
        .mockResolvedValueOnce(askOrder)
        .mockResolvedValueOnce(bidAccount)
        .mockResolvedValueOnce(askAccount)
        .mockResolvedValueOnce(buyerCoin)
        .mockResolvedValueOnce(sellerCash)
        .mockResolvedValueOnce(buyerLock)
        .mockResolvedValueOnce({ ...sellerCash, locked: '50100' }) // cash in consumeOrderLock (buyer side updates cash locked)
        .mockResolvedValueOnce(sellerLock)
        .mockResolvedValueOnce({ ...buyerCoin, locked: '1' }); // coin in consumeOrderLock (seller side)

      await service.settleTrade(tradeId);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledWith(
        'SERIALIZABLE',
      );
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'trade.executed',
        expect.any(String),
      );
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'order.matched',
        expect.any(String),
      );
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('settleTrade - idempotency', () => {
    it('should return early without changes when trade is already CONFIRMED', async () => {
      const trade = createTrade({ settlementStatus: 'CONFIRMED' });
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(trade);

      await service.settleTrade(tradeId);

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(mockRedis.publish).not.toHaveBeenCalled();
    });
  });

  describe('settleTrade - trade not found', () => {
    it('should throw BusinessException when trade does not exist', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(service.settleTrade(tradeId)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.settleTrade(tradeId)).rejects.toMatchObject({
        message: 'Trade not found',
        getResponse: expect.any(Function),
      });
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('settleTrade - trade already failed', () => {
    it('should throw when settlementStatus is FAILED', async () => {
      const trade = createTrade({ settlementStatus: 'FAILED' });
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(trade);

      const promise = service.settleTrade(tradeId);
      await expect(promise).rejects.toThrow(BusinessException);
      await expect(promise).rejects.toMatchObject({
        message: 'Trade already failed',
      });
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('settleTrade - account frozen (rollback)', () => {
    it('should rollback and mark trade FAILED when bid account is FROZEN', async () => {
      const trade = createTrade();
      const bidOrder = createOrder('1', 'LIMIT');
      const askOrder = createOrder('2', 'LIMIT');
      const bidAccount = createAccount('10', 'FROZEN');
      const askAccount = createAccount('20', 'ACTIVE');

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(trade)
        .mockResolvedValueOnce(bidOrder)
        .mockResolvedValueOnce(askOrder)
        .mockResolvedValueOnce(bidAccount)
        .mockResolvedValueOnce(askAccount);

      await expect(service.settleTrade(tradeId)).rejects.toThrow(
        AccountFrozenException,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockDataSource.createQueryBuilder).toHaveBeenCalled();
      const updateCall = mockDataSource.createQueryBuilder().set.mock.calls[0];
      expect(updateCall[0]).toEqual({ settlementStatus: 'FAILED' });
      expect(mockRedis.publish).not.toHaveBeenCalled();
    });

    it('should rollback and mark trade FAILED when ask account is FROZEN', async () => {
      const trade = createTrade();
      const bidOrder = createOrder('1', 'LIMIT');
      const askOrder = createOrder('2', 'LIMIT');
      const bidAccount = createAccount('10', 'ACTIVE');
      const askAccount = createAccount('20', 'FROZEN');

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(trade)
        .mockResolvedValueOnce(bidOrder)
        .mockResolvedValueOnce(askOrder)
        .mockResolvedValueOnce(bidAccount)
        .mockResolvedValueOnce(askAccount);

      await expect(service.settleTrade(tradeId)).rejects.toThrow(
        AccountFrozenException,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockDataSource.createQueryBuilder().set).toHaveBeenCalledWith({
        settlementStatus: 'FAILED',
      });
    });
  });

  describe('settleTrade - order not found', () => {
    it('should throw when bid order is missing', async () => {
      const trade = createTrade();
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(trade)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createOrder('2', 'LIMIT'));

      const promise = service.settleTrade(tradeId);
      await expect(promise).rejects.toThrow(BusinessException);
      await expect(promise).rejects.toMatchObject({
        message: 'Order not found for trade',
      });
    });
  });
});
