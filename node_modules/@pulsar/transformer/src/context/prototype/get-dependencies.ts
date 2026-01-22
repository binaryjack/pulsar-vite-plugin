import * as ts from 'typescript'
import { ITransformationContext } from '../transformation-context.types'

/**
 * Extract signal/state dependencies from an expression
 * Walks the AST to find all signal getter calls
 */
export const getDependencies = function(
    this: ITransformationContext,
    node: ts.Node
): string[] {
    const dependencies: string[] = []

    const visit = (node: ts.Node) => {
        if (this.isStateAccess(node)) {
            const callExpr = node as ts.CallExpression

            // Get the name of the signal being accessed
            if (ts.isIdentifier(callExpr.expression)) {
                dependencies.push(callExpr.expression.text)
            } else if (ts.isPropertyAccessExpression(callExpr.expression)) {
                // Handle chained property access: user().name
                const text = callExpr.expression.getText(this.sourceFile)
                dependencies.push(text)
            }
        }

        ts.forEachChild(node, visit)
    }

    visit(node)
    return dependencies
}
