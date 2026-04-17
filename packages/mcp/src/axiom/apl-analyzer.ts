import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const WASM_DIR = join(__dirname, 'wasm');

export type APLNode = {
  kind?: string;
  [key: string]: unknown;
};

type WasmAnalyzeResult = {
  valid: boolean;
  error: string | null;
  ast: string | null;
};

type AnalyzeFn = (query: string) => WasmAnalyzeResult;
type GoRuntime = {
  importObject: object;
  run(instance: unknown): void | Promise<void>;
};
type GoConstructor = new () => GoRuntime;
type WebAssemblyRuntime = {
  instantiate(
    module: ArrayBuffer,
    importObject: object
  ): Promise<{ instance: unknown }>;
};
type APLAnalyzerGlobal = typeof globalThis & {
  Go?: GoConstructor;
  AnalyzeAPL?: AnalyzeFn;
  WebAssembly: WebAssemblyRuntime;
};

type ParsedAPL = {
  valid: boolean;
  error: string | null;
  ast: APLNode | null;
};

let analyzeFnPromise: Promise<AnalyzeFn> | null = null;

export function getWasmExecModulePath(): string {
  return join(WASM_DIR, 'wasm_exec.js');
}

export async function analyzeAPL(query: string): Promise<ParsedAPL> {
  const analyzeFn = await getAnalyzeFn();
  const result = analyzeFn(query);

  if (!(result.valid && result.ast)) {
    return {
      valid: false,
      error: result.error,
      ast: null,
    };
  }

  return {
    valid: true,
    error: null,
    ast: JSON.parse(result.ast) as APLNode,
  };
}

async function getAnalyzeFn(): Promise<AnalyzeFn> {
  if (analyzeFnPromise) {
    return analyzeFnPromise;
  }

  analyzeFnPromise = (async () => {
    await import(getWasmExecModulePath());

    const analyzerGlobal = globalThis as APLAnalyzerGlobal;
    const GoCtor = analyzerGlobal.Go;
    if (!GoCtor) {
      throw new Error(
        'Go runtime not found — wasm_exec.js failed to initialize'
      );
    }

    const go = new GoCtor();
    const wasmBuffer = await loadWasmBinary('apl-analyzer.wasm');
    const { instance } = await analyzerGlobal.WebAssembly.instantiate(
      wasmBuffer,
      go.importObject
    );
    go.run(instance);

    const analyzeFn = analyzerGlobal.AnalyzeAPL;
    if (!analyzeFn) {
      throw new Error('AnalyzeAPL not found — WASM failed to initialize');
    }

    return analyzeFn;
  })();

  return analyzeFnPromise;
}

async function loadWasmBinary(fileName: string): Promise<ArrayBuffer> {
  const wasmPath = join(WASM_DIR, fileName);
  if (!existsSync(wasmPath)) {
    throw new Error(`${fileName} not found in ${WASM_DIR}`);
  }

  const buffer = readFileSync(wasmPath);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
}
