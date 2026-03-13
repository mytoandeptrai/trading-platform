import { registerAs } from '@nestjs/config';

export interface JwtConfig {
  secret: string;
  expirationSeconds: number;
  refreshSecret: string;
  refreshExpirationSeconds: number;
}

export default registerAs(
  'jwt',
  (): JwtConfig => ({
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expirationSeconds: parseInt(process.env.JWT_EXPIRATION || '86400', 10),
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || 'change-me-refresh-in-production',
    refreshExpirationSeconds: parseInt(
      process.env.JWT_REFRESH_EXPIRATION || '604800',
      10,
    ),
  }),
);

