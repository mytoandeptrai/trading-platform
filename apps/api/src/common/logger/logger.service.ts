import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor() {
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const logDir = process.env.LOG_DIR || 'logs';
    const logLevel = process.env.LOG_LEVEL || 'info';
    const nodeEnv = process.env.NODE_ENV || 'development';

    // Custom format for structured logging
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.metadata({
        fillExcept: ['message', 'level', 'timestamp', 'label'],
      }),
    );

    // Console format (pretty print for development)
    const consoleFormat = winston.format.combine(
      logFormat,
      winston.format.colorize(),
      winston.format.printf(
        ({ timestamp, level, message, context, metadata }) => {
          const ctx = context || this.context || 'Application';
          const meta = Object.keys(metadata).length
            ? JSON.stringify(metadata, null, 2)
            : '';
          return `${timestamp} [${ctx}] ${level}: ${message} ${meta}`;
        },
      ),
    );

    // JSON format (for production and file logging)
    const jsonFormat = winston.format.combine(logFormat, winston.format.json());

    // Transports
    const transports: winston.transport[] = [];

    // Console transport (always enabled)
    transports.push(
      new winston.transports.Console({
        format: nodeEnv === 'production' ? jsonFormat : consoleFormat,
      }),
    );

    // File transports (only in production or if LOG_DIR is set)
    if (nodeEnv === 'production' || process.env.LOG_DIR) {
      // Error logs
      transports.push(
        new DailyRotateFile({
          filename: path.join(logDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          format: jsonFormat,
          maxSize: '20m',
          maxFiles: '14d',
          zippedArchive: true,
        }),
      );

      // Combined logs
      transports.push(
        new DailyRotateFile({
          filename: path.join(logDir, 'combined-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          format: jsonFormat,
          maxSize: '20m',
          maxFiles: '14d',
          zippedArchive: true,
        }),
      );

      // Debug logs (only in development)
      if (nodeEnv === 'development') {
        transports.push(
          new DailyRotateFile({
            filename: path.join(logDir, 'debug-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'debug',
            format: jsonFormat,
            maxSize: '20m',
            maxFiles: '7d',
          }),
        );
      }
    }

    return winston.createLogger({
      level: logLevel,
      transports,
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(logDir, 'exceptions.log'),
          format: jsonFormat,
        }),
      ],
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(logDir, 'rejections.log'),
          format: jsonFormat,
        }),
      ],
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    this.logger.info(message, { context: context || this.context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, {
      context: context || this.context,
      trace,
    });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context: context || this.context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context: context || this.context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context: context || this.context });
  }

  // Additional methods for structured logging
  logWithMetadata(
    level: string,
    message: string,
    metadata: any,
    context?: string,
  ) {
    this.logger.log(level, message, {
      context: context || this.context,
      ...metadata,
    });
  }

  // Trade-specific logging
  logTrade(tradeId: number, message: string, metadata?: any) {
    this.logger.info(message, {
      context: 'Trade',
      tradeId,
      ...metadata,
    });
  }

  // Order-specific logging
  logOrder(orderId: number, message: string, metadata?: any) {
    this.logger.info(message, {
      context: 'Order',
      orderId,
      ...metadata,
    });
  }

  // Performance logging
  logPerformance(operation: string, durationMs: number, metadata?: any) {
    this.logger.info(`${operation} completed`, {
      context: 'Performance',
      operation,
      durationMs,
      ...metadata,
    });
  }
}
