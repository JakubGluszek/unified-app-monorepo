import React from 'react';
import ReactDOM from 'react-dom/client';

import '@repo/ui/globals.css';

import { TRPCReactProvider } from '@repo/shared/trpc';
import { App } from '@repo/app';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <TRPCReactProvider config={{ apiUrl: import.meta.env.VITE_API_BASE_URL }}>
      <App config={{ isDev: import.meta.env.DEV, commitSHA: import.meta.env.VITE_COMMIT_SHA }} />
    </TRPCReactProvider>
  </React.StrictMode>
);
