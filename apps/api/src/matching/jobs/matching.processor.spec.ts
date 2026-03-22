import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import type { Job } from 'bullmq';
import { MatchingProcessor } from './matching.processor';
import { OrderbookService } from '../orderbook.service';
import { SettlementService } from '../settlement.service';
import { OrderEntity } from '../entities/order.entity';
import { TradeEntity } from '../entities/trade.entity';

type ProcessOrderJob = { orderId: number };

describe('MatchingProcessor', () => {
  let processor: MatchingProcessor;
  let mockDataSource: {
    getRepository: jest.Mock;
    createQueryRunner: jest.Mock;
  };
  let mockOrderbookService: {
    getBestAsk: jest.Mock;
    getBestBid: jest.Mock;
    removeOrder: jest.Mock;
    adjustLevel: jest.Mock;
  };
  let mockSettlementService: { settleTrade: jest.Mock };

  let mockRepoFindOne: jest.Mock;
  let mockRepoSave: jest.Mock;
  let mockQrManagerFindOne: jest.Mock;
  let mockQrManagerSave: jest.Mock;
  let mockQrManagerCreate: jest.Mock;

  const createOrder = (
    id: string,
    overrides: Partial<OrderEntity> = {},
  ): OrderEntity =>
    ({
      id,
      accountId: id === '1' ? '10' : '20',
      pairName: 'BTC/USD',
      isBid: id === '1',
      orderType: 'LIMIT',
      price: id === '1' ? '50000' : '50000',
      amount: '2',
      filled: '0',
      remaining: '2',
      status: 'PENDING',
      ...overrides,
    }) as OrderEntity;

  beforeEach(async () => {
    mockRepoFindOne = jest.fn();
    mockRepoSave = jest
      .fn()
      .mockImplementation((entity) => Promise.resolve(entity));
    mockQrManagerFindOne = jest.fn();
    mockQrManagerSave = jest.fn().mockImplementation((entity: unknown) => {
      const e = entity as { id?: string; bidOrderId?: string };
      if (e?.bidOrderId && e.id == null) {
        return Promise.resolve({ ...e, id: 'trade-99' });
      }
      return Promise.resolve(entity);
    });
    mockQrManagerCreate = jest.fn((_, dto: unknown) => dto);

    const mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        findOne: mockQrManagerFindOne,
        save: mockQrManagerSave,
        create: mockQrManagerCreate,
      },
    };

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue({
        findOne: mockRepoFindOne,
        save: mockRepoSave,
      }),
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    mockOrderbookService = {
      getBestAsk: jest.fn(),
      getBestBid: jest.fn(),
      removeOrder: jest.fn().mockResolvedValue(undefined),
      adjustLevel: jest.fn().mockResolvedValue(undefined),
    };

    mockSettlementService = {
      settleTrade: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingProcessor,
        { provide: DataSource, useValue: mockDataSource },
        { provide: OrderbookService, useValue: mockOrderbookService },
        { provide: SettlementService, useValue: mockSettlementService },
      ],
    }).compile();

    processor = module.get<MatchingProcessor>(MatchingProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createJob = (orderId: number): Job<ProcessOrderJob> =>
    ({ data: { orderId } }) as Job<ProcessOrderJob>;

  describe('process() - early exits', () => {
    it('should return without running matchLoop when job has no orderId', async () => {
      const job = { data: { orderId: undefined } } as Job<ProcessOrderJob>;

      await processor.process(job);

      expect(mockRepoFindOne).not.toHaveBeenCalled();
      expect(mockOrderbookService.getBestAsk).not.toHaveBeenCalled();
    });

    it('should return when order is not found', async () => {
      mockRepoFindOne.mockResolvedValue(null);

      await processor.process(createJob(999));

      expect(mockRepoFindOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: '999' } }),
      );
      expect(mockOrderbookService.getBestAsk).not.toHaveBeenCalled();
    });

    it('should return when order status is not PENDING or PARTLY_FILLED', async () => {
      const order = createOrder('1', { status: 'COMPLETED' });
      mockRepoFindOne.mockResolvedValue(order);

      await processor.process(createJob(1));

      expect(mockOrderbookService.getBestAsk).not.toHaveBeenCalled();
    });

    it('should return when remaining <= 0', async () => {
      const order = createOrder('1', { remaining: '0' });
      mockRepoFindOne.mockResolvedValue(order);

      await processor.process(createJob(1));

      expect(mockOrderbookService.getBestAsk).not.toHaveBeenCalled();
    });
  });

  describe('process() - no liquidity (MARKET order)', () => {
    it('should set MARKET order to CANCELED when no opposite side and nothing filled', async () => {
      const order = createOrder('1', {
        orderType: 'MARKET',
        remaining: '2',
        filled: '0',
      });
      mockRepoFindOne.mockResolvedValue(order);
      mockOrderbookService.getBestAsk.mockResolvedValue(null);

      await processor.process(createJob(1));

      expect(mockOrderbookService.getBestAsk).toHaveBeenCalledWith('BTC/USD');
      expect(mockRepoSave).toHaveBeenCalled();
      const savedOrder = mockRepoSave.mock.calls[0][0];
      expect(savedOrder.status).toBe('CANCELED');
    });

    it('should set MARKET order to PARTLY_FILLED when no more liquidity but had some filled', async () => {
      const order = createOrder('1', {
        orderType: 'MARKET',
        remaining: '1',
        filled: '1',
        status: 'PARTLY_FILLED',
      });
      mockRepoFindOne.mockResolvedValue(order);
      mockOrderbookService.getBestAsk.mockResolvedValue(null);

      await processor.process(createJob(1));

      expect(mockRepoSave).toHaveBeenCalled();
      const savedOrder = mockRepoSave.mock.calls[0][0];
      expect(savedOrder.status).toBe('PARTLY_FILLED');
    });
  });

  describe('process() - price compatibility (LIMIT orders)', () => {
    it('should not match when LIMIT BUY and best ask price > limit', async () => {
      const order = createOrder('1', {
        orderType: 'LIMIT',
        isBid: true,
        price: '50000',
        remaining: '2',
      });
      const oppOrder = createOrder('2', { isBid: false, price: '50000' });
      mockRepoFindOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(oppOrder);
      mockOrderbookService.getBestAsk.mockResolvedValue({
        orderId: '2',
        price: 51000,
      });

      await processor.process(createJob(1));

      expect(mockOrderbookService.getBestAsk).toHaveBeenCalledWith('BTC/USD');
      expect(mockSettlementService.settleTrade).not.toHaveBeenCalled();
      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('should not match when LIMIT SELL and best bid price < limit', async () => {
      const order = createOrder('1', {
        orderType: 'LIMIT',
        isBid: false,
        price: '50100',
        remaining: '2',
      });
      order.pairName = 'BTC/USD';
      const oppOrder = createOrder('2', { isBid: true, price: '50100' });
      mockRepoFindOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(oppOrder);
      mockOrderbookService.getBestBid.mockResolvedValue({
        orderId: '2',
        price: 49900,
      });

      await processor.process(createJob(1));

      expect(mockOrderbookService.getBestBid).toHaveBeenCalledWith('BTC/USD');
      expect(mockSettlementService.settleTrade).not.toHaveBeenCalled();
    });
  });

  describe('process() - successful match (price-time priority)', () => {
    it('should use best ask from orderbook, create trade, settle, and update levels', async () => {
      const order = createOrder('1', {
        orderType: 'LIMIT',
        isBid: true,
        price: '50000',
        remaining: '2',
      });
      const oppOrder = createOrder('2', {
        isBid: false,
        price: '50000',
        remaining: '2',
      });
      const lockedOrder = { ...order };
      const lockedOpp = { ...oppOrder };

      mockRepoFindOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(oppOrder)
        .mockResolvedValueOnce({
          ...oppOrder,
          status: 'COMPLETED',
          remaining: '0',
        });
      mockOrderbookService.getBestAsk.mockResolvedValue({
        orderId: '2',
        price: 50000,
      });
      mockQrManagerFindOne
        .mockResolvedValueOnce(lockedOrder)
        .mockResolvedValueOnce(lockedOpp);

      await processor.process(createJob(1));

      expect(mockOrderbookService.getBestAsk).toHaveBeenCalledWith('BTC/USD');
      expect(mockQrManagerCreate).toHaveBeenCalledWith(
        TradeEntity,
        expect.objectContaining({
          bidOrderId: '1',
          askOrderId: '2',
          pairName: 'BTC/USD',
          price: '50000',
          quantity: '2',
          value: '100000',
          settlementStatus: 'PENDING',
        }),
      );
      expect(mockSettlementService.settleTrade).toHaveBeenCalledWith(
        'trade-99',
      );
      expect(mockOrderbookService.adjustLevel).toHaveBeenCalled();
      expect(mockOrderbookService.adjustLevel).toHaveBeenCalledWith(
        'BTC/USD',
        true,
        50000,
        -2,
      );
      expect(mockOrderbookService.adjustLevel).toHaveBeenCalledWith(
        'BTC/USD',
        false,
        50000,
        -2,
      );
      expect(mockOrderbookService.removeOrder).toHaveBeenCalledWith(
        'BTC/USD',
        false,
        '2',
      );
    });
  });

  describe('process() - stale opposite order in book', () => {
    it('should remove stale order from book and continue when opp order not in DB', async () => {
      const order = createOrder('1', { remaining: '2' });
      mockRepoFindOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(null);
      mockOrderbookService.getBestAsk.mockResolvedValue({
        orderId: '999',
        price: 50000,
      });

      await processor.process(createJob(1));

      expect(mockOrderbookService.removeOrder).toHaveBeenCalledWith(
        'BTC/USD',
        false,
        '999',
      );
      expect(mockSettlementService.settleTrade).not.toHaveBeenCalled();
    });
  });

  describe('process() - partial fill then no liquidity', () => {
    it('should match once (partial), then exit when no more liquidity on next iteration', async () => {
      const order = createOrder('1', { remaining: '3' });
      const oppOrder = createOrder('2', { remaining: '1' });
      const lockedOrder = { ...order };
      const lockedOpp = { ...oppOrder };

      mockRepoFindOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(oppOrder)
        .mockResolvedValueOnce({
          ...order,
          remaining: '2',
          filled: '1',
          status: 'PARTLY_FILLED',
        })
        .mockResolvedValueOnce({
          ...oppOrder,
          remaining: '0',
          status: 'COMPLETED',
        })
        .mockResolvedValueOnce({
          ...order,
          remaining: '2',
          status: 'PARTLY_FILLED',
        });
      mockOrderbookService.getBestAsk
        .mockResolvedValueOnce({ orderId: '2', price: 50000 })
        .mockResolvedValueOnce(null);

      mockQrManagerFindOne
        .mockResolvedValueOnce(lockedOrder)
        .mockResolvedValueOnce(lockedOpp);

      await processor.process(createJob(1));

      expect(mockSettlementService.settleTrade).toHaveBeenCalledTimes(1);
      expect(mockOrderbookService.adjustLevel).toHaveBeenCalledWith(
        'BTC/USD',
        true,
        50000,
        -1,
      );
      expect(mockOrderbookService.adjustLevel).toHaveBeenCalledWith(
        'BTC/USD',
        false,
        50000,
        -1,
      );
    });
  });
});
