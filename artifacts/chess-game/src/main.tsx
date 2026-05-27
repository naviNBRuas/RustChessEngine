import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { preloadWasm } from './lib/wasmLoader';

createRoot(document.getElementById('root')!).render(<App />);

// Try to warm up the wasm binary in the background for faster first use.
if (typeof window !== 'undefined') {
  // schedule after first paint
  requestAnimationFrame(() => {
    try {
      preloadWasm();
    } catch {
      /* ignore */
    }
  });
}
