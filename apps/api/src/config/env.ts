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
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

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
