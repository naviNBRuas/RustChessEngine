import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const maxBytes = Number(process.env.WASM_MAX_BYTES || 1200000); // 1.2MB default
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const wasmDir = path.resolve(__dirname, '..', 'artifacts', 'chess-game', 'src', 'chess-wasm');

function findWasmFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.wasm'))
    .map((f) => path.join(dir, f));
}

const files = findWasmFiles(wasmDir);
if (files.length === 0) {
  const isCI = String(process.env.CI || '').toLowerCase() === 'true';
  const failOnMissing =
    String(process.env.FAIL_ON_MISSING_WASM || '').toLowerCase() === '1' ||
    String(process.env.FAIL_ON_MISSING_WASM || '').toLowerCase() === 'true';
  const skipCheck =
    String(process.env.SKIP_WASM_CHECK || '').toLowerCase() === '1' ||
    String(process.env.SKIP_WASM_CHECK || '').toLowerCase() === 'true';
  if (skipCheck) {
    console.warn('Skipping wasm check due to SKIP_WASM_CHECK');
    process.exit(0);
  }
  if (isCI || failOnMissing) {
    console.error('No wasm files found in', wasmDir);
    process.exit(2);
  }
  console.warn(
    'No wasm files found in',
    wasmDir,
    '- continuing locally. Set FAIL_ON_MISSING_WASM=1 or run in CI to make this an error.'
  );
  process.exit(0);
}

let ok = true;
for (const f of files) {
  const stat = fs.statSync(f);
  console.log(`WASM: ${path.basename(f)} — ${stat.size} bytes`);
  if (stat.size > maxBytes) {
    console.error(`WASM file ${path.basename(f)} exceeds limit ${maxBytes} bytes`);
    ok = false;
  }
}

process.exit(ok ? 0 : 3);
