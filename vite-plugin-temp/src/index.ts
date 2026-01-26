import * as ts from 'typescript';
import type { Plugin } from 'vite';

/**
 * Vite plugin for pulsar framework
 * Transforms TSX syntax into direct DOM manipulation using the pulsar transformer
 *
 * @example
 * ```ts
 * import { defineConfig } from 'vite'
 * import { pulsarPlugin } from '@pulsar/vite-plugin'
 *
 * export default defineConfig({
 *   plugins: [pulsarPlugin()]
 * })
 * ```
 */
// Cache the transformer to avoid re-importing on every file
let cachedTransformer: any = null;
let cachedProgram: ts.Program | null = null;

const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  jsx: ts.JsxEmit.Preserve,
  strict: false,
  esModuleInterop: true,
  skipLibCheck: true,
};

function pulsarPlugin(): Plugin {
  return {
    name: 'pulsar-vite-plugin',
    enforce: 'pre',

    async transform(code: string, id: string) {
      // Only transform .tsx files
      if (!id.endsWith('.tsx')) {
        return null;
      }

      const startTime = performance.now();
      const fileName = id.split('/').pop();

      // Import the transformer once and cache it
      if (!cachedTransformer) {
        const transformerModule = await import('@pulsar-framework/transformer');
        cachedTransformer = transformerModule.default;
      }

      // Create source file directly - no need for full Program
      const sourceFile = ts.createSourceFile(
        id,
        code,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.TSX
      );

      // Create a minimal program only once for the transformer factory
      if (!cachedProgram) {
        const host = ts.createCompilerHost(compilerOptions);
        cachedProgram = ts.createProgram([id], compilerOptions, host);
      }

      // Get the transformer factory using cached transformer and program
      const transformerFactory = cachedTransformer(cachedProgram);

      // Transform the source file
      const result = ts.transform(sourceFile, [transformerFactory]);
      const transformedFile = result.transformed[0];

      // Print the transformed file
      const printer = ts.createPrinter();
      const outputCode = printer.printFile(transformedFile);

      // Clean up
      result.dispose();

      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      console.log(`[pulsar] ${fileName} transformed in ${duration}ms`);

      return {
        code: outputCode,
        map: null,
      };
    },
  };
}

// Named export for convenience
export { pulsarPlugin };

// Default export
export default pulsarPlugin;
