declare namespace NodeJS {
  interface ProcessEnv {
    readonly PORT: string;
    readonly AWS_REGION: string;
    readonly AWS_ACCESS_KEY_ID: string;
    readonly AWS_SECRET_ACCESS_KEY: string;
    readonly AUTH_SECRET_ACCESS_KEY: string;
  }
}
