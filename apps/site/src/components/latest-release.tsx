import React from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { Button } from '@repo/ui/components/ui/button';
import { Separator } from '@repo/ui/components/ui/separator';

import rpc from '../client';
import withQueryProvider from './with-query-provider';

const generateDownloadURL = (id: string, os: 'linux' | 'windows' | 'mac', filename: string) =>
  `${import.meta.env.PUBLIC_API_BASE_URL}/api/download/${id}/${os}/${filename}`;

const LatestRelease: React.FC = () => {
  const { data, error, isLoading } = useQuery({
    queryKey: ['latestRelease'],
    queryFn: async () => {
      const response = await rpc.releases.latest['$get']();
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return await response.json();
    }
  });

  if (isLoading) {
    return <p>Fetching latest release...</p>;
  }

  if (error) {
    return <p>Failed to fetch latest release. The download feat is most likely disabled.</p>;
  }

  return (
    <div className="mt-4 border bg-muted/50 rounded">
      <h2 className="font-bold px-6 py-3">Latest Release</h2>
      <Separator />
      <div className="space-y-4 p-6">
        <div>
          <p className="font-mono">Version: {data?.version}</p>
          <p className="font-mono">Date: {dayjs(data?.timestamp).format('YYYY-MM-DD')}</p>
        </div>
        <Separator />

        {data?.assets.linux && (
          <div>
            <h4 className="font-semibold">Linux:</h4>
            <div className="flex flex-col gap-2">
              {data.assets.linux.deb && (
                <Button asChild>
                  <a href={generateDownloadURL(data.id, 'linux', data.assets.linux.deb)}>
                    DOWNLOAD .Deb
                  </a>
                </Button>
              )}
              {data.assets.linux.appImage && (
                <Button asChild>
                  <a href={generateDownloadURL(data.id, 'linux', data.assets.linux.appImage)}>
                    DOWNLOAD .AppImage
                  </a>
                </Button>
              )}
              {data.assets.linux.snap && (
                <Button asChild>
                  <a href={generateDownloadURL(data.id, 'linux', data.assets.linux.snap)}>
                    DOWNLOAD .Snap
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Windows assets */}
        {data?.assets.windows && (
          <div>
            <h4 className="font-semibold">Windows:</h4>
            {data.assets.windows.exe && (
              <Button asChild>
                <a href={generateDownloadURL(data.id, 'windows', data.assets.windows.exe)}>
                  DOWNLOAD .exe
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Mac assets */}
        {data?.assets.mac && (
          <div>
            <h4 className="font-semibold">Mac:</h4>
            {data.assets.mac.dmg && (
              <Button asChild>
                <a href={generateDownloadURL(data.id, 'mac', data.assets.mac.dmg)}>DOWNLOAD .dmg</a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default withQueryProvider(LatestRelease);
