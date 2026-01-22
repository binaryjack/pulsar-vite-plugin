import * as ts from 'typescript'
import { ITransformationContext } from '../../context/transformation-context.types'
import { IJSXElementIR } from '../../ir/types'

/**
 * Generates TypeScript AST nodes from JSX IR
 */
export interface IElementGenerator {
    /**
     * Generate code for a JSX element
     */
    generate: (elementIR: IJSXElementIR) => ts.Expression

    /**
     * Generate code for a component function call
     */
    generateComponentCall: (componentIR: any) => ts.Expression

    /**
     * Generate code for a static element (no reactive updates)
     */
    generateStaticElement: (elementIR: IJSXElementIR) => ts.Expression

    /**
     * Generate code for a dynamic element (with reactive updates)
     */
    generateDynamicElement: (elementIR: IJSXElementIR) => ts.Expression

    /**
     * Generate code for JSX fragments (<></>)
     */
    generateFragment: (fragmentIR: any) => ts.Expression

    /**
     * Generate code for event listeners
     */
    generateEventListeners: (
        elementVar: string,
        elementIR: IJSXElementIR
    ) => ts.Statement[]

    /**
     * Generate code for children
     */
    generateChildren: (
        children: any[],
        parentVar: string
    ) => ts.Statement[]

    /**
     * Generate code for dynamic properties
     */
    generateDynamicProps: (
        elementVar: string,
        elementIR: IJSXElementIR
    ) => ts.Statement[]

    /**
     * Generate code for ref assignment
     */
    generateRefAssignment: (
        elementVar: string,
        refExpr: ts.Expression
    ) => ts.Statement | null
}

/**
 * Symbol token for dependency injection
 */
export const SElementGenerator = Symbol.for('IElementGenerator')

/**
 * Internal interface with context access for ElementGenerator
 */
export interface IElementGeneratorInternal extends IElementGenerator {
    context: ITransformationContext
    varCounter: number
}
