/**
 * Tests for constant folding optimization
 */

import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { extractConstantValue, isConstant } from '../optimizer/analyzers/constant-analyzer'
import { foldConstants } from '../optimizer/optimizers/constant-folder'

describe('Constant Folding', () => {
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

        const result = foldConstants(sourceFile, typeChecker, context)
        const printer = ts.createPrinter()
        return {
            code: printer.printFile(result.sourceFile),
            result: result.result
        }
    }

    it('should fold simple string constants', () => {
        const source = `
            const greeting = "Hello";
            console.log(greeting);
        `
        const { code, result } = transform(source)
        
        expect(result.foldedCount).toBeGreaterThan(0)
        expect(code).toContain('"Hello"')
    })

    it('should fold numeric constants', () => {
        const source = `
            const x = 42;
            const y = x + 10;
        `
        const { code, result } = transform(source)
        
        expect(result.foldedCount).toBeGreaterThan(0)
    })

    it('should fold boolean constants', () => {
        const source = `
            const isActive = true;
            if (isActive) {
                console.log("active");
            }
        `
        const { code, result } = transform(source)
        
        expect(result.foldedCount).toBeGreaterThan(0)
        expect(code).toContain('true')
    })

    it('should fold object literals', () => {
        const source = `
            const config = { theme: "dark", size: 10 };
            console.log(config.theme);
        `
        const { code, result } = transform(source)
        
        expect(result.foldedCount).toBeGreaterThan(0)
    })

    it('should fold array literals', () => {
        const source = `
            const numbers = [1, 2, 3];
            console.log(numbers[0]);
        `
        const { code, result } = transform(source)
        
        expect(result.foldedCount).toBeGreaterThan(0)
    })

    it('should not fold mutable variables', () => {
        const source = `
            let x = 42;
            x = 100;
            console.log(x);
        `
        const { result } = transform(source)
        
        // Should not fold 'let' variables
        expect(result.foldedCount).toBe(0)
    })

    it('should track bytes reduced', () => {
        const source = `
            const longVariableName = "value";
            console.log(longVariableName);
            console.log(longVariableName);
        `
        const { result } = transform(source)
        
        expect(result.bytesReduced).toBeGreaterThan(0)
    })
})

describe('Constant Analyzer', () => {
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

    it('should detect string literals as constants', () => {
        const { typeChecker, sourceFile } = createTypeChecker(`"hello"`)
        const node = sourceFile.statements[0]
        
        expect(isConstant(node, typeChecker)).toBe(true)
    })

    it('should detect numeric literals as constants', () => {
        const { typeChecker, sourceFile } = createTypeChecker(`42`)
        const node = sourceFile.statements[0]
        
        expect(isConstant(node, typeChecker)).toBe(true)
    })

    it('should extract constant values', () => {
        const { typeChecker, sourceFile } = createTypeChecker(`"test"`)
        const node = sourceFile.statements[0]
        
        const value = extractConstantValue(node, typeChecker)
        expect(value).toBeDefined()
        expect(value?.value).toBe('test')
    })
})
