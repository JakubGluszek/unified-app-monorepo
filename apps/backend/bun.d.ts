declare module 'bun' {
  interface Env {
    PORT: string;
    AWS_REGION: string;
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    S3_BUCKET_NAME: string;
    AUTH_SECRET_ACCESS_KEY: string;
    LOG_LEVEL?: 'info' | 'debug';
  }
}
