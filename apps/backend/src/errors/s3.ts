import { type StatusCode } from 'hono/utils/http-status';

export const s3Error = {
  NotFound: { status: 404 as StatusCode, message: 'Resource not found' },
  Unauthorized: { status: 401 as StatusCode, message: 'Unauthorized access' },
  RateLimit: { status: 429 as StatusCode, message: 'Rate limit exceeded' },
  Internal: { status: 500 as StatusCode, message: 'Internal server error' }
} as const;

export type S3ErrorType = keyof typeof s3Error;
export type S3ErrorResponse = (typeof s3Error)[S3ErrorType];

export const createError = (type: S3ErrorType): S3ErrorResponse => s3Error[type];
