import { describe, expect, it } from 'vitest';
import {
  IngestionValidationError,
  normalizeAndValidateFilePath,
  validateBatch,
} from '../src/lib/ingestion';

describe('Code Intelligence Engine — Ingestion Validation', () => {
  it('normalizes valid relative paths and converts Windows backslashes', () => {
    expect(normalizeAndValidateFilePath('src\\components\\App.tsx')).toBe('src/components/App.tsx');
    expect(normalizeAndValidateFilePath('src/./lib/../lib/api.ts')).toBe('src/lib/api.ts');
    expect(normalizeAndValidateFilePath('   index.ts   ')).toBe('index.ts');
  });

  it('rejects absolute paths and Windows drive letters', () => {
    expect(() => normalizeAndValidateFilePath('/etc/passwd')).toThrow(IngestionValidationError);
    expect(() => normalizeAndValidateFilePath('C:\\Windows\\System32\\calc.exe')).toThrow(
      IngestionValidationError,
    );
    expect(() => normalizeAndValidateFilePath('D:/Projects/repo/secret.ts')).toThrow(
      IngestionValidationError,
    );
  });

  it('detects and blocks directory traversal attempts', () => {
    expect(() => normalizeAndValidateFilePath('../secret.ts')).toThrow(IngestionValidationError);
    expect(() => normalizeAndValidateFilePath('src/../../etc/passwd')).toThrow(
      IngestionValidationError,
    );
    expect(() => normalizeAndValidateFilePath('..')).toThrow(IngestionValidationError);
  });

  it('blocks forbidden directories and sensitive files (.git, node_modules, .env, private keys)', () => {
    expect(() => normalizeAndValidateFilePath('.git/config')).toThrow(IngestionValidationError);
    expect(() => normalizeAndValidateFilePath('node_modules/express/index.js')).toThrow(
      IngestionValidationError,
    );
    expect(() => normalizeAndValidateFilePath('.env')).toThrow(IngestionValidationError);
    expect(() => normalizeAndValidateFilePath('config/.env.local')).toThrow(
      IngestionValidationError,
    );
    expect(() => normalizeAndValidateFilePath('dist/bundle.js')).toThrow(IngestionValidationError);
    expect(() => normalizeAndValidateFilePath('certs/server.key')).toThrow(
      IngestionValidationError,
    );
    expect(() => normalizeAndValidateFilePath('.ssh/id_rsa')).toThrow(IngestionValidationError);
    expect(() => normalizeAndValidateFilePath('binary.exe')).toThrow(IngestionValidationError);
  });

  it('validates batch constraints: max files, max file size, and max total size', () => {
    // Empty batch
    expect(() => validateBatch([])).toThrow('Batch must contain at least one file');

    // Duplicate files in batch
    expect(() =>
      validateBatch([
        { filePath: 'src/index.ts', content: 'console.log(1);' },
        { filePath: 'src/./index.ts', content: 'console.log(2);' },
      ]),
    ).toThrow('Duplicate file path in batch');

    // Individual file size limit (150KB)
    const largeContent = 'a'.repeat(160 * 1024);
    expect(() => validateBatch([{ filePath: 'src/large.ts', content: largeContent }])).toThrow(
      'exceeds max size limit',
    );

    // Valid batch
    const valid = validateBatch([
      { filePath: 'src/index.ts', content: 'export const x = 1;' },
      { filePath: 'src/types.ts', content: 'export type X = number;' },
    ]);
    expect(valid).toHaveLength(2);
    expect(valid[0]!.filePath).toBe('src/index.ts');
  });
});
