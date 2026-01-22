import * as ts from 'typescript'
import { IJSXAnalyzer } from '../jsx-analyzer.types'

/**
 * Extracts signal/state dependencies from an expression
 */
export const extractDependencies = function(
    this: IJSXAnalyzer,
    expr: ts.Expression
): string[] {
    const dependencies: string[] = []
    
    // Simple implementation - looks for identifiers
    // Full implementation would use a visitor pattern
    const visitNode = (node: ts.Node) => {
        if (ts.isIdentifier(node)) {
            dependencies.push(node.text)
        }
        ts.forEachChild(node, visitNode)
    }
    
    visitNode(expr)
    
    return dependencies
}
