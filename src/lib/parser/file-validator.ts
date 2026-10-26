// File validation utility with security, sanitization, and size caps

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
export const MAX_RAW_TEXT_LENGTH = 150_000; // 150,000 characters limit
export const SUPPORTED_FILE_EXTENSIONS = ['pdf', 'docx', 'txt'] as const;

export function isValidResumeExtension(filename: string): boolean {
  if (!filename || typeof filename !== 'string') return false;
  const parts = filename.trim().split('.');
  if (parts.length < 2) return false;
  const ext = parts.pop()?.toLowerCase();
  return ext === 'pdf' || ext === 'docx' || ext === 'txt';
}

export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') return 'resume_upload.pdf';

  // Strip null bytes and non-printable control characters
  let clean = filename.replace(/[\x00-\x1f\x7f]/g, '');

  // Extract base filename (strip both POSIX and Windows directory paths)
  clean = clean.replace(/^.*[/\\]/, '');

  // Strip repeating directory traversal dots
  clean = clean.replace(/\.\.+/g, '.').replace(/^[.]+/, '');

  // Replace remaining separators or dangerous characters
  clean = clean.replace(/[/\\]/g, '_').trim();

  // If filename is empty or only whitespace/periods, provide safe default
  if (!clean || clean === '.' || clean === '..') {
    return 'resume_upload.pdf';
  }

  return clean;
}

export function validateFileBuffer(buffer: Buffer, filename: string): ValidationResult {
  if (!buffer || buffer.length === 0) {
    return {
      isValid: false,
      error: `File '${filename}' is empty (0 bytes).`,
    };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File '${filename}' exceeds maximum allowed size of 10MB.`,
    };
  }

  return { isValid: true };
}

export function validateResumeText(rawText: string): { isValid: boolean; error?: string; cleanedText: string } {
  if (!rawText || rawText.trim().length === 0) {
    return {
      isValid: false,
      error: 'Resume text is empty.',
      cleanedText: '',
    };
  }

  const trimmed = rawText.trim();
  const cleanedText = trimmed.length > MAX_RAW_TEXT_LENGTH
    ? trimmed.slice(0, MAX_RAW_TEXT_LENGTH)
    : trimmed;

  return {
    isValid: true,
    cleanedText,
  };
}

export function validateFile(
  filename: string,
  buffer?: Buffer | ArrayBuffer | string,
  sizeBytes?: number
): ValidationResult {
  if (!filename || filename.trim().length === 0) {
    return {
      isValid: false,
      error: 'Filename must not be empty.',
    };
  }

  // Security: check for path traversal or null byte injection
  if (filename.includes('..') || filename.includes('\0') || /[\x00-\x1f]/.test(filename)) {
    return {
      isValid: false,
      error: 'Invalid or insecure filename detected.',
    };
  }

  if (!isValidResumeExtension(filename)) {
    return {
      isValid: false,
      error: 'File must have a valid extension (.pdf, .docx, or .txt).',
    };
  }

  if (sizeBytes !== undefined && sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File '${filename}' exceeds maximum allowed size of 10MB.`,
    };
  }

  if (buffer) {
    let byteLen = 0;
    if (Buffer.isBuffer(buffer)) {
      byteLen = buffer.length;
    } else if (typeof buffer === 'string') {
      byteLen = Buffer.byteLength(buffer);
      if (buffer.length > MAX_RAW_TEXT_LENGTH) {
        return {
          isValid: false,
          error: `Text content exceeds maximum allowed length of ${MAX_RAW_TEXT_LENGTH.toLocaleString()} characters.`,
        };
      }
    } else if (buffer instanceof ArrayBuffer) {
      byteLen = buffer.byteLength;
    }

    if (byteLen === 0) {
      return {
        isValid: false,
        error: `File '${filename}' is empty (0 bytes).`,
      };
    }
  }

  return { isValid: true };
}
