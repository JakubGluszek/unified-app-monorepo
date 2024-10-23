interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_COMMIT_SHA: string;
}

// Extend ImportMeta to include the env property
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
