import '@repo/shared/types/global';
import '@repo/ui/globals.css';

import { api } from '@repo/shared/trpc';
import { Button } from '@repo/ui/components/ui/button';
import { Separator } from '@repo/ui/components/ui/separator';

import {
  AppWindowIcon,
  CodeIcon,
  FileLockIcon,
  GlobeIcon,
  LoaderCircleIcon,
  RocketIcon,
  ServerIcon
} from 'lucide-react';
import { ThemeProvider, ThemeToggle } from './components/theme';
import StatusIcon from './components/status-icon';
import { isElectron } from './utils';

const isDesktop = isElectron();

const showNativeDialog = () => {
  if (isElectron()) {
    window.api.showMessage('Hello from Electron!');
  } else {
    alert('Native actions are disabled in the web environment.');
  }
};

const App = ({ config }: { config: { appVersion?: string; isDev: boolean } }) => {
  const { isSuccess, isLoading } = api.greeting.useQuery();

  return (
    <ThemeProvider defaultTheme="dark" storageKey="theme">
      <div className="min-h-screen h-full flex flex-col">
        <header className="flex items-center justify-end p-4">
          <ThemeToggle />
        </header>
        <main className="m-auto w-full flex flex-col max-w-sm text-xl font-semibold text-muted-foreground gap-2">
          <div className="flex flex-col space-y-4 border bg-muted/50 rounded p-6">
            <div className="flex items-center gap-4">
              {isDesktop ? (
                <>
                  <AppWindowIcon className="w-5 h-5" />
                  Desktop
                </>
              ) : (
                <>
                  <GlobeIcon className="w-5 h-5" />
                  Web
                </>
              )}
            </div>
            <Separator />
            <div className="flex items-center gap-4">
              {config.isDev ? (
                <>
                  <CodeIcon className="w-5 h-5" />
                  Development
                </>
              ) : (
                <>
                  <RocketIcon className="w-5 h-5" />
                  Production
                </>
              )}
            </div>
            <Separator />
            <div className="flex items-center gap-4">
              <ServerIcon className="w-5 h-5" />
              API&nbsp;
              {isLoading ? (
                <LoaderCircleIcon className="w-5 h-5 animate-spin" />
              ) : (
                <span className="ml-auto">
                  <StatusIcon status={isSuccess ? 'online' : 'offline'} />
                </span>
              )}
            </div>
            {isDesktop && (
              <>
                <Separator />
                <div className="flex items-center gap-4">
                  <>
                    <FileLockIcon className="w-5 h-5" />
                    {config.appVersion?.slice(0, 7) ?? 'No signature'}
                  </>
                </div>
              </>
            )}
          </div>
          {isDesktop && (
            <Button variant="outline" onClick={showNativeDialog}>
              Test native dialog
            </Button>
          )}
          <div className="text-center mt-8">
            <a
              href="https://github.com/JakubGluszek/unified-app-monorepo"
              target="_blank"
              className="font-extrabold tracking-tight hover:underline underline-offset-4 hover:text-primary"
            >
              Github
            </a>
            <p className="text-sm">v0.0.1</p>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
};

export default App;
