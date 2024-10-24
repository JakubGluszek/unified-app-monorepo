interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_COMMIT_SHA: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
