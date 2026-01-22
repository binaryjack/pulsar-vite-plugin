import * as ts from 'typescript'
import { DIValidator, ErrorEnhancer, PropValidator, RouteTypeExtractor, TypeAnalyzer } from '../compiler-api'
import { addImport } from './prototype/add-import'
import { getDependencies } from './prototype/get-dependencies'
import { isStateAccess } from './prototype/is-state-access'
import { ITransformationContext } from './transformation-context.types'

/**
 * Transformation context implementation
 * Tracks state and utilities during transformation
 */
export const TransformationContext = function(
    this: ITransformationContext,
    program: ts.Program,
    sourceFile: ts.SourceFile,
    context: ts.TransformationContext
) {
    // Store immutable properties
    Object.defineProperty(this, 'program', {
        value: program,
        writable: false,
        configurable: false,
        enumerable: true
    })

    const typeChecker = program.getTypeChecker()
    
    Object.defineProperty(this, 'typeChecker', {
        value: typeChecker,
        writable: false,
        configurable: false,
        enumerable: true
    })
    
    // TypeScript Compiler API utilities
    Object.defineProperty(this, 'typeAnalyzer', {
        value: new TypeAnalyzer(typeChecker),
        writable: false,
        configurable: false,
        enumerable: true
    })
    
    Object.defineProperty(this, 'routeTypeExtractor', {
        value: new RouteTypeExtractor(typeChecker),
        writable: false,
        configurable: false,
        enumerable: true
    })
    
    Object.defineProperty(this, 'diValidator', {
        value: new DIValidator(typeChecker),
        writable: false,
        configurable: false,
        enumerable: true
    })
    
    Object.defineProperty(this, 'errorEnhancer', {
        value: new ErrorEnhancer(),
        writable: false,
        configurable: false,
        enumerable: true
    })
    
    Object.defineProperty(this, 'propValidator', {
        value: new PropValidator(typeChecker),
        writable: false,
        configurable: false,
        enumerable: true
    })

    Object.defineProperty(this, 'sourceFile', {
        value: sourceFile,
        writable: false,
        configurable: false,
        enumerable: true
    })

    Object.defineProperty(this, 'context', {
        value: context,
        writable: false,
        configurable: false,
        enumerable: true
    })

    // Mutable properties
    Object.defineProperty(this, 'currentComponent', {
        value: null,
        writable: true,
        configurable: false,
        enumerable: true
    })

    Object.defineProperty(this, 'imports', {
        value: new Set<string>(),
        writable: false,
        configurable: false,
        enumerable: true
    })
} as any as {
    new (
        program: ts.Program,
        sourceFile: ts.SourceFile,
        context: ts.TransformationContext
    ): ITransformationContext
}

// Attach prototype methods
Object.assign(TransformationContext.prototype, {
    addImport,
    isStateAccess,
    getDependencies
})
