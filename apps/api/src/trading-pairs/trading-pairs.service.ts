import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradingPair } from '../common/entities/trading-pair.entity';

@Injectable()
export class TradingPairsService {
  constructor(
    @InjectRepository(TradingPair)
    private readonly tradingPairRepository: Repository<TradingPair>,
  ) {}

  /**
   * Get all trading pairs
   */
  async findAll(): Promise<TradingPair[]> {
    return this.tradingPairRepository.find({
      order: { id: 'ASC' },
    });
  }

  /**
   * Get all active trading pairs
   */
  async findActive(): Promise<TradingPair[]> {
    return this.tradingPairRepository.find({
      where: { isTradingActive: true },
      order: { id: 'ASC' },
    });
  }

  /**
   * Get a single trading pair by name
   */
  async findByName(name: string): Promise<TradingPair> {
    const pair = await this.tradingPairRepository.findOne({
      where: { name },
    });

    if (!pair) {
      throw new NotFoundException(`Trading pair ${name} not found`);
    }

    return pair;
  }

  /**
   * Get a single trading pair by ID
   */
  async findById(id: number): Promise<TradingPair> {
    const pair = await this.tradingPairRepository.findOne({
      where: { id },
    });

    if (!pair) {
      throw new NotFoundException(`Trading pair with ID ${id} not found`);
    }

    return pair;
  }
}
