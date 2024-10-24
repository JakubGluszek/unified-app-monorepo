import { createClient } from '@repo/shared/rpc';

const rpc = createClient(import.meta.env.PUBLIC_API_BASE_URL);

export default rpc;
