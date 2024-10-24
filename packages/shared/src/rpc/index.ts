import { hc } from 'hono/client';
import type { ApiRouter } from 'backend/src/routes/index';

export const createClient = (baseApiUrl: string) =>
  hc<ApiRouter>(baseApiUrl + '/api', {
    init: { credentials: 'include' }
  });

export type ClientType = ReturnType<typeof createClient>;
