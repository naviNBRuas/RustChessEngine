// Vite import.meta.env typing for this workspace
interface ImportMetaEnv {
  readonly BASE_URL?: string;
  // add other env vars your app expects here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
