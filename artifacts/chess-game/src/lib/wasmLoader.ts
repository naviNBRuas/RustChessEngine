// Lightweight wasm preloader and dynamic loader.
// The project may emit wasm artifacts under /src/chess-wasm when built by wasm-pack.

export function preloadWasm() {
  try {
    // resolve relative to this file inside the package to avoid build-time warnings
    const base = new URL('../chess-wasm/', import.meta.url).pathname;
    // Attempt to guess common wasm filename patterns and insert <link rel=preload>
    const candidates = ['pkg_bg.wasm', 'chess_engine_bg.wasm', 'chess_engine.wasm'];
    for (const c of candidates) {
      const href = base + c;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = 'fetch';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  } catch (e) {
    // ignore in environments where import.meta.url isn't file/URL-friendly
    // or when DOM isn't available
  }
}

export async function loadWasmModule<T = unknown>(modulePath: string): Promise<T> {
  // dynamic import the JS glue produced by wasm-pack (target=web)
  // Example modulePath: '/src/chess-wasm/pkg.js'
  return (await import(/* @vite-ignore */ modulePath)) as unknown as T;
}
