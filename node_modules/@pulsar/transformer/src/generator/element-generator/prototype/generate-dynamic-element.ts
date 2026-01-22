import * as ts from 'typescript'
import { IJSXElementIR } from '../../../ir/types'
import { IElementGenerator } from '../element-generator.types'

/**
 * Generates code for a dynamic element with reactive updates
 * Example output:
 *   const el = document.createElement('div')
 *   el.className = 'container'
 *   createEffect(() => {
 *       el.textContent = count()
 *   })
 *   return el
 */
export const generateDynamicElement = function(
    this: IElementGenerator,
    elementIR: IJSXElementIR
): ts.Expression {
    const factory = ts.factory
    const statements: ts.Statement[] = []

    // Generate unique variable name
    const elementVar = `el${(this as any).varCounter++}`

    // const el = document.createElement('div')
    statements.push(
        factory.createVariableStatement(
            undefined,
            factory.createVariableDeclarationList(
                [
                    factory.createVariableDeclaration(
                        factory.createIdentifier(elementVar),
                        undefined,
                        undefined,
                        factory.createCallExpression(
                            factory.createPropertyAccessExpression(
                                factory.createIdentifier('document'),
                                factory.createIdentifier('createElement')
                            ),
                            undefined,
                            [factory.createStringLiteral(elementIR.tag || 'div')]
                        )
                    )
                ],
                ts.NodeFlags.Const
            )
        )
    )

    // Set static properties first
    elementIR.props.forEach(prop => {
        if (prop.isStatic && prop.value) {
            statements.push(
                factory.createExpressionStatement(
                    factory.createBinaryExpression(
                        factory.createPropertyAccessExpression(
                            factory.createIdentifier(elementVar),
                            factory.createIdentifier(prop.name)
                        ),
                        factory.createToken(ts.SyntaxKind.EqualsToken),
                        prop.value as ts.Expression
                    )
                )
            )
        }
    })

    // Generate dynamic property updates wrapped in createEffect
    const dynamicPropStatements = this.generateDynamicProps(
        elementVar,
        elementIR
    )
    statements.push(...dynamicPropStatements)

    // Generate event listeners
    const eventStatements = this.generateEventListeners(
        elementVar,
        elementIR
    )
    statements.push(...eventStatements)

    // Handle children
    if (elementIR.children.length > 0) {
        const childStatements = this.generateChildren(
            elementIR.children,
            elementVar
        )
        statements.push(...childStatements)
    }

    // Handle ref if present
    const refProp = elementIR.props.find(p => p.name === 'ref')
    if (refProp && refProp.value) {
        const refStatement = this.generateRefAssignment(
            elementVar,
            refProp.value as ts.Expression
        )
        if (refStatement) {
            statements.push(refStatement)
        }
    }

    // Return element
    statements.push(
        factory.createReturnStatement(
            factory.createIdentifier(elementVar)
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
