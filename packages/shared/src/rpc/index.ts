import { hc } from 'hono/client';
import type { ApiRouter } from 'backend';

export const createClient = (baseApiUrl: string) =>
  hc<ApiRouter>(baseApiUrl + '/api', {
    init: { credentials: 'include' }
  });

export type ClientType = ReturnType<typeof createClient>;
