import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  DuplicateEmailException,
  DuplicateUsernameException,
  InvalidCredentialsException,
  InvalidTokenException,
} from '../common/exceptions/business.exception';
import { LoggerService } from '../common/logger/logger.service';
import { DatabaseService } from '../database/database.service';

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

  constructor(
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
    private readonly db: DatabaseService,
  ) {
    this.logger.setContext('AuthService');
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if email exists
    const emailCheck = await this.db.query(
      'SELECT id FROM "user" WHERE email = $1',
      [dto.email],
    );

    if (emailCheck.rows.length > 0) {
      throw new DuplicateEmailException(dto.email);
    }

    // Check if username exists
    const usernameCheck = await this.db.query(
      'SELECT id FROM "user" WHERE username = $1',
      [dto.username],
    );

    if (usernameCheck.rows.length > 0) {
      throw new DuplicateUsernameException(dto.username);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Create user
    const result = await this.db.query(
      `INSERT INTO "user" (username, email, password_hash, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, true, NOW(), NOW())
       RETURNING id, username, email`,
      [dto.username, dto.email, passwordHash],
    );

    const user = result.rows[0];

    this.logger.log(`User registered: ${user.username} (${user.email})`);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens({
      sub: user.id,
      username: user.username,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    // Find user
    const result = await this.db.query(
      'SELECT id, username, email, password_hash, is_active FROM "user" WHERE username = $1',
      [dto.username],
    );

    if (result.rows.length === 0) {
      throw new InvalidCredentialsException();
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      throw new InvalidCredentialsException();
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    this.logger.log(`User logged in: ${user.username}`);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens({
      sub: user.id,
      username: user.username,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(oldRefreshToken: string): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        oldRefreshToken,
        {
          secret: process.env.JWT_REFRESH_SECRET,
        },
      );

      // Get fresh user data
      const result = await this.db.query(
        'SELECT id, username, email, is_active FROM "user" WHERE id = $1',
        [payload.sub],
      );

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        throw new InvalidTokenException();
      }

      const user = result.rows[0];

      // Generate new tokens
      const { accessToken, refreshToken } = await this.generateTokens({
        sub: user.id,
        username: user.username,
        email: user.email,
      });

      return {
        user: {
          id: user.id,
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
    const result = await this.db.query(
      'SELECT id, username, email, is_active FROM "user" WHERE id = $1',
      [userId],
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return null;
    }

    return result.rows[0];
  }

  private async generateTokens(payload: JwtPayload): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: parseInt(process.env.JWT_EXPIRATION || '86400'), // 24 hours
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRATION || '604800'), // 7 days
    });

    return { accessToken, refreshToken };
  }
}
