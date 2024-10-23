import { Hono } from 'hono';
import { logger } from 'hono/logger';
import releases from './releases';

const api = new Hono().use('*', logger()).route('/releases', releases);

export type ApiRouter = typeof api;
export default api;
