import * as ts from 'typescript'
import { IJSXAnalyzer } from '../jsx-analyzer.types'

/**
 * Analyzes JSX children and returns child IR
 */
export const analyzeChildren = function(
    this: IJSXAnalyzer,
    children: ts.NodeArray<ts.JsxChild>
): any[] {
    const result: any[] = []
    
    children.forEach(child => {
        if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
            result.push(this.analyze(child))
        } else if (ts.isJsxExpression(child) && child.expression) {
            // The expression needs to be visited to transform any JSX inside it
            // We'll capture it and let the generator handle visiting it
            result.push({
                type: 'expression',
                expression: child.expression,
                isStatic: this.isStaticValue(child.expression),
                dependsOn: this.extractDependencies(child.expression)
            })
        } else if (ts.isJsxText(child)) {
            const text = child.text.trim()
            if (text) {
                result.push({
                    type: 'text',
                    content: text,
                    isStatic: true
                })
            }
        } else if (ts.isJsxFragment(child)) {
            // Handle JSX fragments
            result.push(this.analyze(child))
        }
    })
    
    return result
}
