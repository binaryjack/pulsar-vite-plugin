import * as ts from 'typescript';
import type { HmrContext, ModuleNode, Plugin } from 'vite';

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

export interface PulsarPluginOptions {
  /**
   * Enable caching for production builds
   * @default false (caching disabled for better HMR)
   */
  enableCache?: boolean;
}

const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  jsx: ts.JsxEmit.Preserve,
  strict: false,
  esModuleInterop: true,
  skipLibCheck: true,
};

function pulsarPlugin(options: PulsarPluginOptions = {}): Plugin {
  const { enableCache = false } = options;

  // Only cache in production or if explicitly enabled
  let cachedTransformer: any = null;
  let cachedProgram: ts.Program | null = null;
  let isDevMode = true;

  return {
    name: 'pulsar-vite-plugin',
    enforce: 'pre',

    configResolved(config) {
      isDevMode = config.command === 'serve';

      // Clear cache in dev mode for better HMR
      if (isDevMode && !enableCache) {
        cachedTransformer = null;
        cachedProgram = null;
      }
    },

    async transform(code: string, id: string) {
      // Only transform .tsx files
      if (!id.endsWith('.tsx')) {
        return null;
      }

      const startTime = performance.now();
      const fileName = id.split('/').pop();

      // In dev mode without caching, always import fresh transformer
      const shouldCache = !isDevMode || enableCache;

      let transformer: any;
      if (shouldCache && cachedTransformer) {
        transformer = cachedTransformer;
      } else {
        const transformerModule = await import('@pulsar-framework/transformer');
        transformer = transformerModule.default;
        if (shouldCache) {
          cachedTransformer = transformer;
        }
      }

      // Create source file for this specific transformation
      const sourceFile = ts.createSourceFile(
        id,
        code,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.TSX
      );

      // Create program - in dev mode, create fresh program per file for HMR
      let program: ts.Program;
      if (shouldCache && cachedProgram) {
        program = cachedProgram;
      } else {
        const host = ts.createCompilerHost(compilerOptions);
        program = ts.createProgram([id], compilerOptions, host);
        if (shouldCache) {
          cachedProgram = program;
        }
      }

      // Get the transformer factory
      const transformerFactory = transformer(program);

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

      if (isDevMode) {
        console.log(
          `[pulsar] ⚡ ${fileName} transformed in ${duration}ms ${shouldCache ? '(cached)' : '(fresh)'}`
        );
      }

      return {
        code: outputCode,
        map: null,
      };
    },

    handleHotUpdate(ctx: HmrContext) {
      // When a .tsx file changes, clear caches and trigger HMR
      if (ctx.file.endsWith('.tsx')) {
        // Clear caches to ensure fresh transformation on next request
        cachedProgram = null;

        // Invalidate the module to trigger re-transformation
        const module = ctx.modules.find((m: ModuleNode) => m.file === ctx.file);
        if (module) {
          ctx.server.moduleGraph.invalidateModule(module);
        }

        // Return modules to update (let Vite handle the HMR)
        return ctx.modules;
      }
    },
  };
}

// Named export for convenience
export { pulsarPlugin };

// Default export
export default pulsarPlugin;
