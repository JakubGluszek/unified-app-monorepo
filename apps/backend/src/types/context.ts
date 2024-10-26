import type { Context as HonoContext } from 'hono';

export interface Variables {
  requestId: string;
}

export type Context = HonoContext<{
  Variables: Variables;
}>;
