/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LLM_ADAPTER?: 'mock' | 'proxy';
  readonly VITE_LLM_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  render_game_to_text?: () => string;
  advanceTime?: (ms: number) => void;
}
