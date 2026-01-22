/**
 * Tests for dead code elimination
 */

import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { analyzeDeadCode } from '../optimizer/analyzers/dead-code-analyzer'
import { eliminateDeadCode } from '../optimizer/optimizers/dead-code-eliminator'

describe('Dead Code Elimination', () => {
    function createProgram(source: string) {
        const sourceFile = ts.createSourceFile(
            'test.ts',
            source,
            ts.ScriptTarget.Latest,
            true
        )

        const host: ts.CompilerHost = {
            getSourceFile: (fileName) => fileName === 'test.ts' ? sourceFile : undefined,
            getDefaultLibFileName: () => 'lib.d.ts',
            writeFile: () => {},
            getCurrentDirectory: () => '',
            getCanonicalFileName: (fileName) => fileName,
            useCaseSensitiveFileNames: () => true,
            getNewLine: () => '\n',
            fileExists: () => true,
            readFile: () => ''
        }

        const program = ts.createProgram(['test.ts'], {}, host)
        return { program, sourceFile }
    }

    function transform(source: string) {
        const { program, sourceFile } = createProgram(source)
        const typeChecker = program.getTypeChecker()
        
        const context: ts.TransformationContext = {
            getCompilerOptions: () => program.getCompilerOptions(),
            factory: ts.factory,
            getEmitResolver: () => undefined as any,
            hoistFunctionDeclaration: () => {},
            hoistVariableDeclaration: () => {},
            requestEmitHelper: () => {},
            readEmitHelpers: () => undefined,
            enableEmitNotification: () => {},
            enableSubstitution: () => {},
            isEmitNotificationEnabled: () => false,
            isSubstitutionEnabled: () => false,
            onEmitNode: () => {},
            onSubstituteNode: (hint, node) => node
        } as ts.TransformationContext

        const result = eliminateDeadCode(sourceFile, typeChecker, context)
        const printer = ts.createPrinter()
        return {
            code: printer.printFile(result.sourceFile),
            result: result.result
        }
    }

    it('should remove unused variables', () => {
        const source = `
            const used = 42;
            const unused = 100;
            console.log(used);
        `
        const { code, result } = transform(source)
        
        expect(result.removedCount).toBeGreaterThan(0)
        expect(code).not.toContain('unused')
        expect(code).toContain('used')
    })

    it('should remove unused functions', () => {
        const source = `
            function used() { return 1; }
            function unused() { return 2; }
            used();
        `
        const { code, result } = transform(source)
        
        expect(result.removedCount).toBeGreaterThan(0)
        expect(code).not.toContain('unused')
    })

    it('should remove unused imports', () => {
        const source = `
            import { used, unused } from 'module';
            console.log(used);
        `
        const { code, result } = transform(source)
        
        expect(result.removedCount).toBeGreaterThan(0)
        expect(code).not.toContain('unused')
    })

    it('should not remove exported items', () => {
        const source = `
            export const value = 42;
            export function func() { return 1; }
        `
        const { result } = transform(source)
        
        expect(result.removedCount).toBe(0)
    })

    it('should track bytes removed', () => {
        const source = `
            const veryLongUnusedVariableName = "this is a long string that should be removed";
            const used = 1;
            console.log(used);
        `
        const { result } = transform(source)
        
        expect(result.bytesRemoved).toBeGreaterThan(0)
    })

    it('should track removed items by type', () => {
        const source = `
            const unusedVar = 42;
            function unusedFunc() {}
            import { unusedImport } from 'module';
            
            const used = 1;
            console.log(used);
        `
        const { result } = transform(source)
        
        const variables = result.removedItems.filter(i => i.type === 'variable')
        const functions = result.removedItems.filter(i => i.type === 'function')
        const imports = result.removedItems.filter(i => i.type === 'import')
        
        expect(variables.length).toBeGreaterThan(0)
        expect(functions.length).toBeGreaterThan(0)
        expect(imports.length).toBeGreaterThan(0)
    })
})

describe('Dead Code Analyzer', () => {
    function createTypeChecker(source: string) {
        const sourceFile = ts.createSourceFile(
            'test.ts',
            source,
            ts.ScriptTarget.Latest,
            true
        )

        const host: ts.CompilerHost = {
            getSourceFile: (fileName) => fileName === 'test.ts' ? sourceFile : undefined,
            getDefaultLibFileName: () => 'lib.d.ts',
            writeFile: () => {},
            getCurrentDirectory: () => '',
            getCanonicalFileName: (fileName) => fileName,
            useCaseSensitiveFileNames: () => true,
            getNewLine: () => '\n',
            fileExists: () => true,
            readFile: () => ''
        }

        const program = ts.createProgram(['test.ts'], {}, host)
        return { typeChecker: program.getTypeChecker(), sourceFile }
    }

    it('should detect unused variables', () => {
        const { typeChecker, sourceFile } = createTypeChecker(`
            const used = 42;
            const unused = 100;
            console.log(used);
        `)
        
        const deadCode = analyzeDeadCode(sourceFile, typeChecker)
        const unusedVars = deadCode.filter(dc => dc.type === 'variable')
        
        expect(unusedVars.length).toBeGreaterThan(0)
        expect(unusedVars[0].name).toBe('unused')
    })

    it('should detect unused functions', () => {
        const { typeChecker, sourceFile } = createTypeChecker(`
            function used() {}
            function unused() {}
            used();
        `)
        
        const deadCode = analyzeDeadCode(sourceFile, typeChecker)
        const unusedFuncs = deadCode.filter(dc => dc.type === 'function')
        
        expect(unusedFuncs.length).toBeGreaterThan(0)
        expect(unusedFuncs[0].name).toBe('unused')
    })
})
