import { type _Object } from '@aws-sdk/client-s3';
import { err, ok } from 'neverthrow';
import { log } from './logger';
import { createError } from '../errors/s3';
import { type Release } from '../types/release';

const getReleaseIdFromS3Object = (object: _Object) => {
  // Handle error
  if (!object.Key)
    return err({
      message: "Release ID couldn't be determined when parsing S3 objects",
      status: 500
    }).mapErr((error) => {
      log(error.message);
      return error;
    });

  const releaseId = object.Key.split('/')[2];
  if (!releaseId) return err(createError('Internal'));
  return ok(releaseId);
};

export const parseReleaseFromS3Objects = (objects: _Object[]) => {
  const refObject = objects[0];

  if (!refObject)
    return err(createError('Internal')).mapErr((error) => {
      log({ error });
      return error;
    });

  // Filter out downloadable assets
  const assets = objects.reduce(
    (acc: Release['assets'], obj) => {
      const filename = obj.Key?.split('/').pop()!;

      if (filename.endsWith('.deb')) acc.linux.deb = filename;
      if (filename.endsWith('.AppImage')) acc.linux.appImage = filename;
      if (filename.endsWith('.snap')) acc.linux.snap = filename;
      if (filename.endsWith('.exe')) acc.windows.exe = filename;
      if (filename.endsWith('.dmg')) acc.mac.dmg = filename;
      return acc;
    },
    { linux: {}, windows: {}, mac: {} }
  );

  const result = getReleaseIdFromS3Object(refObject);
  if (result.isErr()) return err(result.error);
  const releaseId = result.value;

  return ok({
    id: releaseId,
    timestamp: refObject.LastModified,
    version: releaseId.substring(0, 7),
    assets
  });
};

export const parseReleasesFromS3Objects = (objects: _Object[]) => {
  // Transform objects into groups by release id
  const releaseGroups = objects.reduce((acc: { [key: string]: _Object[] }, obj) => {
    const releaseId = obj.Key?.split('/')[2];
    if (releaseId) {
      if (!acc[releaseId]) acc[releaseId] = [];
      acc[releaseId].push(obj);
    }
    return acc;
  }, {});

  // Parse groups into an array of releases
  return Object.values(releaseGroups)
    .map((objects) => {
      const result = parseReleaseFromS3Objects(objects);
      if (result.isErr()) return null;
      return result.value;
    })
    .filter((v) => v !== null);
};

export const getContentType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    exe: 'application/x-msdownload',
    dmg: 'application/x-apple-diskimage',
    deb: 'application/vnd.debian.binary-package',
    appimage: 'application/x-executable',
    snap: 'application/vnd.snap',
    bin: 'application/octet-stream',
    zip: 'application/zip',
    gz: 'application/gzip',
    tar: 'application/x-tar'
  };

  return contentTypes[ext ?? ''] || 'application/octet-stream';
};
