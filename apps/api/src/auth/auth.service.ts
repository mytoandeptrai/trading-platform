import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  DuplicateEmailException,
  DuplicateUsernameException,
  InvalidCredentialsException,
  InvalidTokenException,
} from '../common/exceptions/business.exception';
import { LoggerService } from '../common/logger/logger.service';
import { UserEntity } from './entities/user.entity';
import { AccountService } from '../account/account.service';
import { Redis } from 'ioredis';
import type { JwtConfig } from '../config/jwt.config';
import type { RedisConfig } from '../config/redis.config';

export interface JwtPayload {
  sub: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  user: {
    id: number;
    username: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly redis: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @Inject(forwardRef(() => AccountService))
    private readonly accountService: AccountService,
  ) {
    this.logger.setContext('AuthService');

    const redisCfg = this.configService.get<RedisConfig>('redis');
    this.redis = new Redis({
      host: redisCfg?.host || 'localhost',
      port: redisCfg?.port ?? 6379,
      password: redisCfg?.password || undefined,
      db: redisCfg?.db ?? 0,
      maxRetriesPerRequest: 3,
    });
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if email exists
    const existingByEmail = await this.usersRepo.findOne({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existingByEmail) {
      throw new DuplicateEmailException(dto.email);
    }

    // Check if username exists
    const existingByUsername = await this.usersRepo.findOne({
      where: { username: dto.username },
      select: { id: true },
    });
    if (existingByUsername) {
      throw new DuplicateUsernameException(dto.username);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Create user
    let user: UserEntity;
    try {
      user = await this.usersRepo.save(
        this.usersRepo.create({
          username: dto.username,
          email: dto.email,
          passwordHash,
          isActive: true,
        }),
      );
    } catch (error) {
      // Defensive: if UNIQUE constraint races, map to existing errors
      const code = (error as any)?.code as string | undefined;
      if (code === '23505') {
        // Postgres unique_violation
        throw new DuplicateEmailException(dto.email);
      }
      throw error;
    }

    this.logger.log(`User registered: ${user.username} (${user.email})`);

    // Auto-create trading account for user (best-effort; errors bubble up)
    await this.accountService.ensureAccountForUser(Number(user.id));

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens({
      sub: Number(user.id),
      username: user.username,
      email: user.email,
    });

    await this.storeRefreshToken(Number(user.id), refreshToken);

    return {
      user: {
        id: Number(user.id),
        username: user.username,
        email: user.email,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    // Find user
    const user = await this.usersRepo.findOne({
      where: { username: dto.username },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
        isActive: true,
      },
    });
    if (!user) {
      throw new InvalidCredentialsException();
    }

    // Check if user is active
    if (!user.isActive) {
      throw new InvalidCredentialsException();
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    this.logger.log(`User logged in: ${user.username}`);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens({
      sub: Number(user.id),
      username: user.username,
      email: user.email,
    });

    await this.storeRefreshToken(Number(user.id), refreshToken);

    return {
      user: {
        id: Number(user.id),
        username: user.username,
        email: user.email,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(oldRefreshToken: string): Promise<AuthResponse> {
    try {
      // Verify refresh token signature & payload
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        oldRefreshToken,
        {
          secret: process.env.JWT_REFRESH_SECRET,
        },
      );

      // Ensure refresh token matches the latest stored in Redis
      await this.ensureStoredRefreshTokenValid(payload.sub, oldRefreshToken);

      // Get fresh user data
      const user = await this.usersRepo.findOne({
        where: { id: String(payload.sub) },
        select: { id: true, username: true, email: true, isActive: true },
      });
      if (!user || !user.isActive) {
        throw new InvalidTokenException();
      }

      // Generate new tokens
      const { accessToken, refreshToken } = await this.generateTokens({
        sub: Number(user.id),
        username: user.username,
        email: user.email,
      });

      await this.storeRefreshToken(Number(user.id), refreshToken);

      return {
        user: {
          id: Number(user.id),
          username: user.username,
          email: user.email,
        },
        accessToken,
        refreshToken,
      };
    } catch {
      throw new InvalidTokenException();
    }
  }

  async validateUser(userId: number): Promise<any> {
    const user = await this.usersRepo.findOne({
      where: { id: String(userId) },
      select: { id: true, username: true, email: true, isActive: true },
    });
    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: Number(user.id),
      username: user.username,
      email: user.email,
      is_active: user.isActive,
    };
  }

  private async generateTokens(payload: JwtPayload): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const jwtCfg = this.configService.get<JwtConfig>('jwt');

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: jwtCfg?.secret,
      expiresIn: jwtCfg?.expirationSeconds ?? 86400,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: jwtCfg?.refreshSecret,
      expiresIn: jwtCfg?.refreshExpirationSeconds ?? 604800,
    });

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: number,
    token: string,
  ): Promise<void> {
    const key = `refresh_token:${userId}`;
    const jwtCfg = this.configService.get<JwtConfig>('jwt');
    const ttlSeconds = jwtCfg?.refreshExpirationSeconds ?? 604800;
    await this.redis.set(key, token, 'EX', ttlSeconds);
  }

  private async ensureStoredRefreshTokenValid(
    userId: number,
    presentedToken: string,
  ): Promise<void> {
    const key = `refresh_token:${userId}`;
    const stored = await this.redis.get(key);

    if (!stored || stored !== presentedToken) {
      throw new InvalidTokenException();
    }
  }

  /**
   * Helper to set auth cookies on the response.
   * NOTE: Controller is responsible for calling this.
   */
  setAuthCookies(
    res: import('express').Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProd = this.configService.get('NODE_ENV') === 'production';
    const jwtCfg = this.configService.get<JwtConfig>('jwt');
    const accessTtlMs = (jwtCfg?.expirationSeconds ?? 86400) * 1000;
    const refreshTtlMs = (jwtCfg?.refreshExpirationSeconds ?? 604800) * 1000;

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: accessTtlMs,
      path: '/',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: refreshTtlMs,
      path: '/',
    });
  }
}
