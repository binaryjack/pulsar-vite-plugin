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

  // Cache transformer module and program
  let cachedTransformer: any = null;
  let cachedProgram: ts.Program | null = null;
  let transformedFiles = new Set<string>();
  let isDevMode = true;

  return {
    name: 'pulsar-vite-plugin',
    enforce: 'pre',

    configResolved(config) {
      isDevMode = config.command === 'serve';
    },

    buildStart() {
      // Initialize shared program once at build start
      if (!cachedProgram) {
        const host = ts.createCompilerHost(compilerOptions);

        // Create a lightweight program with minimal file set
        cachedProgram = ts.createProgram([], compilerOptions, host);
      }
    },

    async transform(code: string, id: string) {
      // Only transform .tsx files
      if (!id.endsWith('.tsx')) {
        return null;
      }

      const startTime = performance.now();
      const fileName = id.split('/').pop();

      // Cache transformer module
      if (!cachedTransformer) {
        const transformerModule = await import('@pulsar-framework/transformer');
        cachedTransformer = transformerModule.default;
      }

      // Create source file for this specific transformation
      const sourceFile = ts.createSourceFile(
        id,
        code,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.TSX
      );

      // Reuse the cached program - no need to recreate per file
      const program = cachedProgram!;

      // Get the transformer factory
      const transformerFactory = cachedTransformer(program);

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
        const status = transformedFiles.has(id) ? 'cached' : 'fresh';
        transformedFiles.add(id);
        console.log(`[pulsar] ⚡ ${fileName} transformed in ${duration}ms (${status})`);
      }

      return {
        code: outputCode,
        map: null,
      };
    },

    handleHotUpdate(ctx: HmrContext) {
      // When a .tsx file changes, invalidate the module to trigger re-transformation
      if (ctx.file.endsWith('.tsx')) {
        // Mark file as needing fresh transformation
        transformedFiles.delete(ctx.file);

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
