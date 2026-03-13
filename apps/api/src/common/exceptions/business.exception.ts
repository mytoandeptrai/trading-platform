import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string, code: string, details?: any) {
    super(
      {
        error: code,
        message,
        details,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class InsufficientBalanceException extends BusinessException {
  constructor(required: number, available: number) {
    super('Insufficient balance', 'INSUFFICIENT_BALANCE', {
      required,
      available,
      shortage: required - available,
    });
  }
}

export class AccountFrozenException extends BusinessException {
  constructor(accountId: number) {
    super('Account is frozen', 'ACCOUNT_FROZEN', { accountId });
  }
}

export class OrderNotFoundException extends HttpException {
  constructor(orderId: number) {
    super(
      {
        error: 'ORDER_NOT_FOUND',
        message: 'Order not found',
        details: { orderId },
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class DuplicateEmailException extends HttpException {
  constructor(email: string) {
    super(
      {
        error: 'DUPLICATE_EMAIL',
        message: 'Email already exists',
        details: { email },
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class DuplicateUsernameException extends HttpException {
  constructor(username: string) {
    super(
      {
        error: 'DUPLICATE_USERNAME',
        message: 'Username already exists',
        details: { username },
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidCredentialsException extends HttpException {
  constructor() {
    super(
      {
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class InvalidTokenException extends HttpException {
  constructor() {
    super(
      {
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}
