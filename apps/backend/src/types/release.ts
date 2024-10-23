import type { Result } from 'neverthrow';
import { s3Error } from '../errors/s3';

export type S3Result<T> = Result<T, typeof s3Error>;

export interface Release {
  id: string;
  timestamp: string;
  version: string;
  assets: {
    linux: {
      deb?: string;
      appImage?: string;
      snap?: string;
    };
    windows: {
      exe?: string;
    };
    macos: {
      dmg?: string;
    };
  };
}

export type ReleaseList = {
  releases: Release[];
  total: number;
};
