import * as ts from 'typescript'

/**
 * Context passed through the transformation pipeline
 * Tracks state and provides utilities for transformation
 */
export interface ITransformationContext {
    /**
     * TypeScript program
     */
    readonly program: ts.Program

    /**
     * Type checker for type information
     */
    readonly typeChecker: ts.TypeChecker

    /**
     * Source file being transformed
     */
    readonly sourceFile: ts.SourceFile

    /**
     * Transformation context from TypeScript
     */
    readonly context: ts.TransformationContext

    /**
     * JSX visitor function to transform nested JSX in expressions
     */
    jsxVisitor?: ts.Visitor

    /**
     * Component being transformed
     */
    currentComponent: string | null

    /**
     * Import tracker for auto-imports
     */
    readonly imports: Set<string>

    /**
     * Add an import to the import tracker
     */
    addImport: (importName: string, fromModule: string) => void

    /**
     * Check if a node is a signal/state call
     */
    isStateAccess: (node: ts.Node) => boolean

    /**
     * Extract dependencies from an expression
     */
    getDependencies: (node: ts.Node) => string[]
}

/**
 * Symbol token for dependency injection
 */
export const STransformationContext = Symbol.for('ITransformationContext')
