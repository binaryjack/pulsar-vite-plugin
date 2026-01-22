import * as ts from 'typescript'
import { IElementGenerator } from '../element-generator.types'

/**
 * Generates code for JSX fragments (<></>)
 * Example output:
 *   (() => {
 *       const fragment = document.createDocumentFragment()
 *       fragment.appendChild(...)
 *       fragment.appendChild(...)
 *       return fragment
 *   })()
 */
export const generateFragment = function(
    this: IElementGenerator,
    fragmentIR: any
): ts.Expression {
    const factory = ts.factory

    // Generate: document.createDocumentFragment()
    const createFragment = factory.createCallExpression(
        factory.createPropertyAccessExpression(
            factory.createIdentifier('document'),
            factory.createIdentifier('createDocumentFragment')
        ),
        undefined,
        []
    )

    const statements: ts.Statement[] = []
    const fragmentVar = `fragment${(this as any).varCounter++}`

    // const fragment = document.createDocumentFragment()
    statements.push(
        factory.createVariableStatement(
            undefined,
            factory.createVariableDeclarationList(
                [
                    factory.createVariableDeclaration(
                        factory.createIdentifier(fragmentVar),
                        undefined,
                        undefined,
                        createFragment
                    )
                ],
                ts.NodeFlags.Const
            )
        )
    )

    // Generate children and append them
    if (fragmentIR.children && fragmentIR.children.length > 0) {
        const childStatements = this.generateChildren(
            fragmentIR.children,
            fragmentVar
        )
        statements.push(...childStatements)
    }

    // Return fragment
    statements.push(
        factory.createReturnStatement(
            factory.createIdentifier(fragmentVar)
        )
    )

    // Wrap in IIFE
    return factory.createCallExpression(
        factory.createParenthesizedExpression(
            factory.createArrowFunction(
                undefined,
                undefined,
                [],
                undefined,
                factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                factory.createBlock(statements, true)
            )
        ),
        undefined,
        []
    )
}
