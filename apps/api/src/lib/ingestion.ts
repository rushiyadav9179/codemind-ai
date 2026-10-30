import path from 'node:path';

// Max file size: 150 KB
export const MAX_FILE_SIZE_BYTES = 150 * 1024;
// Max total batch size: 2 MB
export const MAX_BATCH_SIZE_BYTES = 2 * 1024 * 1024;
// Max files per batch: 50
export const MAX_FILES_PER_BATCH = 50;

const FORBIDDEN_PATH_SEGMENTS = new Set([
  '.git',
  'node_modules',
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  '.env.test',
  'dist',
  'build',
  'coverage',
  '.idea',
  '.vscode',
]);

const FORBIDDEN_FILENAMES = new Set([
  'id_rsa',
  'id_ed25519',
  'id_dsa',
  '.npmrc',
  '.yarnrc',
  '.dockercfg',
]);

const SENSITIVE_EXTENSIONS = new Set([
  '.pem',
  '.key',
  '.pfx',
  '.p12',
  '.keystore',
  '.cert',
  '.crt',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.zip',
  '.tar',
  '.gz',
]);

export interface NormalizedFile {
  filePath: string;
  content: string;
}

export class IngestionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IngestionValidationError';
  }
}

/**
 * Normalizes and validates incoming relative file paths to prevent directory traversal
 * and block restricted / sensitive / binary file patterns.
 */
export function normalizeAndValidateFilePath(rawPath: string): string {
  if (!rawPath || typeof rawPath !== 'string') {
    throw new IngestionValidationError('File path is required');
  }

  // Remove control characters (ASCII 0-31, 127) and trim
  const cleanPath = Array.from(rawPath)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .trim();
  if (!cleanPath) {
    throw new IngestionValidationError('File path cannot be blank');
  }

  // Reject absolute paths or Windows drive letters
  if (path.isAbsolute(cleanPath) || /^[a-zA-Z]:/.test(cleanPath)) {
    throw new IngestionValidationError(`Absolute file paths are not allowed: ${cleanPath}`);
  }

  // Convert Windows backslashes to forward slashes for POSIX consistency
  const posixPath = cleanPath.replace(/\\/g, '/');

  // Normalize path segments
  const normalized = path.posix.normalize(posixPath);

  // Reject directory traversal attempts (.. escapes root)
  if (normalized.startsWith('../') || normalized === '..' || normalized.includes('/../')) {
    throw new IngestionValidationError(`Path traversal attempt detected: ${cleanPath}`);
  }

  // Split into segments and inspect
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0) {
    throw new IngestionValidationError('Invalid file path');
  }

  for (const segment of segments) {
    if (FORBIDDEN_PATH_SEGMENTS.has(segment.toLowerCase())) {
      throw new IngestionValidationError(`Forbidden path segment: '${segment}' in '${cleanPath}'`);
    }
  }

  const lastSegment = segments[segments.length - 1];
  if (!lastSegment) {
    throw new IngestionValidationError('Invalid file path');
  }
  const fileName = lastSegment.toLowerCase();
  if (FORBIDDEN_FILENAMES.has(fileName)) {
    throw new IngestionValidationError(`Sensitive filename rejected: '${cleanPath}'`);
  }

  const ext = path.extname(fileName).toLowerCase();
  if (SENSITIVE_EXTENSIONS.has(ext)) {
    throw new IngestionValidationError(`Disallowed file extension '${ext}': '${cleanPath}'`);
  }

  return normalized;
}

/**
 * Validates a batch of files before parsing and ingestion.
 */
export function validateBatch(
  files: Array<{ filePath: string; content: string }>,
): NormalizedFile[] {
  if (!Array.isArray(files) || files.length === 0) {
    throw new IngestionValidationError('Batch must contain at least one file');
  }

  if (files.length > MAX_FILES_PER_BATCH) {
    throw new IngestionValidationError(
      `Batch exceeds limit of ${MAX_FILES_PER_BATCH} files (received ${files.length})`,
    );
  }

  let totalBytes = 0;
  const seenPaths = new Set<string>();
  const normalizedFiles: NormalizedFile[] = [];

  for (const item of files) {
    if (typeof item.content !== 'string') {
      throw new IngestionValidationError(`File content must be a string for: ${item.filePath}`);
    }

    const contentBytes = Buffer.byteLength(item.content, 'utf8');
    if (contentBytes > MAX_FILE_SIZE_BYTES) {
      throw new IngestionValidationError(
        `File '${item.filePath}' (${Math.round(contentBytes / 1024)}KB) exceeds max size limit of ${Math.round(MAX_FILE_SIZE_BYTES / 1024)}KB`,
      );
    }

    totalBytes += contentBytes;
    if (totalBytes > MAX_BATCH_SIZE_BYTES) {
      throw new IngestionValidationError(
        `Total batch size exceeds maximum limit of ${Math.round(MAX_BATCH_SIZE_BYTES / (1024 * 1024))}MB`,
      );
    }

    const normalizedPath = normalizeAndValidateFilePath(item.filePath);
    if (seenPaths.has(normalizedPath.toLowerCase())) {
      throw new IngestionValidationError(`Duplicate file path in batch: ${normalizedPath}`);
    }
    seenPaths.add(normalizedPath.toLowerCase());

    normalizedFiles.push({
      filePath: normalizedPath,
      content: item.content,
    });
  }

  return normalizedFiles;
}
