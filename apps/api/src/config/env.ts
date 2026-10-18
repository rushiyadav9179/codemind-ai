import { z } from 'zod';
import * as dotenv from 'dotenv';
import path from 'path';

if (process.env['NODE_ENV'] !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_HOST: z.string().default('localhost'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .refine(
      (value) =>
        value.split(',').every((origin) => z.string().url().safeParse(origin.trim()).success),
      {
        message: 'CORS_ORIGINS must contain comma-separated valid origins',
      },
    )
    .refine(
      (value) =>
        value.split(',').every((origin) => {
          const trimmed = origin.trim();
          try {
            return new URL(trimmed).origin === trimmed;
          } catch {
            return false;
          }
        }),
      { message: 'CORS_ORIGINS entries must be origins without paths or queries' },
    )
    .refine((value) => !value.split(',').some((origin) => origin.trim() === '*'), {
      message: 'CORS_ORIGINS cannot contain a wildcard',
    }),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  AUTH_ACCESS_TOKEN_SECRET: z
    .string()
    .min(32)
    .refine((secret) => !secret.startsWith('replace-with-'), {
      message: 'Replace the example signing secret with a generated value',
    }),
  AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  AUTH_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  AUTH_JWT_ISSUER: z.string().min(1).default('codemind-ai'),
  AUTH_JWT_AUDIENCE: z.string().min(1).default('codemind-ai-web'),
  AUTH_COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  AUTH_COOKIE_SAME_SITE: z.enum(['lax', 'strict']).default('lax'),
});

const parsed = envSchema
  .superRefine((values, context) => {
    if (values.NODE_ENV === 'production' && !values.AUTH_COOKIE_SECURE) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AUTH_COOKIE_SECURE'],
        message: 'AUTH_COOKIE_SECURE must be true in production',
      });
    }
  })
  .safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('\n❌ Invalid or missing environment variables:');
  // eslint-disable-next-line no-console
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  // eslint-disable-next-line no-console
  console.error('\nCheck your .env file against .env.example\n');
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
