import * as dotenv from 'dotenv';
import path from 'node:path';

process.env['NODE_ENV'] = 'test';
process.env['API_PORT'] = '3002';
process.env['API_HOST'] = 'localhost';
process.env['CORS_ORIGINS'] = 'http://localhost:5173';
process.env['LOG_LEVEL'] = 'silent';
process.env['AUTH_ACCESS_TOKEN_SECRET'] = 'test-only-secret-that-is-not-used-outside-tests-123456';
process.env['AUTH_ACCESS_TOKEN_TTL_SECONDS'] = '900';
process.env['AUTH_REFRESH_TOKEN_TTL_DAYS'] = '30';
process.env['AUTH_COOKIE_SECURE'] = 'false';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const testDatabaseUrl =
  process.env['TEST_DATABASE_URL'] ??
  'postgresql://codemind:changeme@localhost:5432/codemind_test?schema=public';
const testDatabaseName = new URL(testDatabaseUrl).pathname.slice(1);
if (!testDatabaseName.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL must point to a database whose name ends with _test');
}
process.env['DATABASE_URL'] = testDatabaseUrl;
