import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..');
const srcDir = join(packageRoot, 'src', 'axiom', 'wasm');
const destDir = join(packageRoot, 'dist', 'src', 'axiom', 'wasm');

if (!existsSync(srcDir)) {
  throw new Error(`WASM source directory missing: ${srcDir}`);
}

mkdirSync(destDir, { recursive: true });
cpSync(srcDir, destDir, { recursive: true });
