import * as ts from 'typescript'

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
export function pulsarPlugin(): any {
  return {
    name: 'pulsar-transformer',
    enforce: 'pre',
    
    async transform(code: string, id: string) {
      // Only transform .tsx files
      if (!id.endsWith('.tsx')) {
        return null
      }
      
      console.log('[pulsar] Processing:', id)
      
      // Import the transformer using relative path to avoid ES module resolution issues
      const { default: transformer } = await import('../transformer/index.js')
      
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.Preserve, // Keep JSX so our transformer can process it
        strict: false,
        esModuleInterop: true,
        skipLibCheck: true,
      }
      
      // Create a compiler host
      const host = ts.createCompilerHost(compilerOptions)
      
      // Override readFile to return our code
      const originalReadFile = host.readFile
      host.readFile = (fileName) => {
        if (fileName === id) {
          return code
        }
        return originalReadFile.call(host, fileName)
      }
      
      // Create source file
      const sourceFile = ts.createSourceFile(
        id,
        code,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.TSX
      )
      
      // Create program with the source file
      const program = ts.createProgram([id], compilerOptions, host)
      
      // Get the transformer factory
      const transformerFactory = transformer(program)
      
      // Transform the source file
      const result = ts.transform(sourceFile, [transformerFactory])
      
      // Check for any remaining JSX nodes
      const transformedFile = result.transformed[0]
      let hasJsxNodes = false
      const checker = (node: ts.Node): ts.Node => {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || 
            ts.isJsxExpression(node) || ts.isJsxFragment(node)) {
          hasJsxNodes = true
          console.error('[pulsar] Found untransformed JSX node:', ts.SyntaxKind[node.kind], 'at line', sourceFile.getLineAndCharacterOfPosition(node.pos).line + 1)
        }
        return ts.visitEachChild(node, checker, undefined)
      }
      ts.visitNode(transformedFile, checker)
      
      if (hasJsxNodes) {
        console.error('[pulsar] ERROR: Transformed AST still contains JSX nodes!')
      }
      
      // Print the transformed file
      const printer = ts.createPrinter()
      const outputCode = printer.printFile(transformedFile)
      
      // Clean up
      result.dispose()
      
      if (outputCode.includes('React')) {
        console.warn('[pulsar] WARNING: React still found in output!')
      }
      
      console.log('[pulsar] Transformed', id.split('/').pop())
      
      return {
        code: outputCode,
        map: null
      }
    }
  }
}

// Default export for convenience
export default pulsarPlugin
