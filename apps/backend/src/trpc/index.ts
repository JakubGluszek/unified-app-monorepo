import { initTRPC } from '@trpc/server';
import SuperJSON from 'superjson';

const t = initTRPC.create({ transformer: SuperJSON });

export const appRouter = t.router({
  greeting: t.procedure.query(() => {
    return `Hi, tRPC endpoint working correctly! 🥳`;
  })
});

export type AppRouter = typeof appRouter;
