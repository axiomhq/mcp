import { isAbsolute } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeAPL, getWasmExecModulePath } from './apl-analyzer';

describe('apl-analyzer', () => {
  it('uses a filesystem path for wasm_exec.js so compiled commonjs can load it', () => {
    const runtimePath = getWasmExecModulePath();

    expect(isAbsolute(runtimePath)).toBe(true);
    expect(runtimePath.endsWith('wasm_exec.js')).toBe(true);
    expect(runtimePath.startsWith('file://')).toBe(false);
  });

  it('parses queries with the checked-in wasm analyzer', async () => {
    const result = await analyzeAPL("['logs'] | take 1");

    expect(result.valid).toBe(true);
    expect(result.ast?.kind).toBe('Doc');
  });
});
