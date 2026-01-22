import * as ts from 'typescript'
import { ITransformationContext } from '../../context/transformation-context.types'

export const SJSXAnalyzer = Symbol.for('IJSXAnalyzer')

export interface IJSXAnalyzer {
    // Constructor signature
    new (context: ITransformationContext): IJSXAnalyzer
    
    readonly context: ITransformationContext
    
    // Prototype methods
    analyze: (node: ts.Node) => any
    analyzeProps: (attributes: ts.JsxAttributes) => any[]
    analyzeChildren: (children: ts.NodeArray<ts.JsxChild>) => any[]
    isStaticElement: (node: ts.Node) => boolean
    isStaticValue: (expr: ts.Expression) => boolean
    extractDependencies: (expr: ts.Expression) => string[]
    extractEvents: (attributes: ts.JsxAttributes) => any[]
}
