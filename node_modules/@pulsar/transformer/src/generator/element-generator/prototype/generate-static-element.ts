import * as ts from 'typescript'
import { IJSXElementIR } from '../../../ir/types'
import { IElementGenerator } from '../element-generator.types'

/**
 * Generates code for a completely static element
 * Example output:
 *   const el = document.createElement('div')
 *   el.className = 'container'
 *   el.textContent = 'Hello'
 *   return el
 */
export const generateStaticElement = function(
    this: IElementGenerator,
    elementIR: IJSXElementIR
): ts.Expression {
    const factory = ts.factory

    // Generate: document.createElement(tagName)
    const createElement = factory.createCallExpression(
        factory.createPropertyAccessExpression(
            factory.createIdentifier('document'),
            factory.createIdentifier('createElement')
        ),
        undefined,
        [factory.createStringLiteral(elementIR.tag || 'div')]
    )

    const statements: ts.Statement[] = []

    // Generate unique variable name: el0, el1, etc.
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
                        createElement
                    )
                ],
                ts.NodeFlags.Const
            )
        )
    )

    // Set static properties
    elementIR.props.forEach(prop => {
        if (prop.isStatic && prop.value) {
            // Check if prop name contains hyphen or special chars (needs setAttribute)
            const needsSetAttribute = prop.name.includes('-') || 
                                      prop.name.startsWith('aria') || 
                                      prop.name.startsWith('data')
            
            if (needsSetAttribute) {
                // el.setAttribute('prop-name', value)
                statements.push(
                    factory.createExpressionStatement(
                        factory.createCallExpression(
                            factory.createPropertyAccessExpression(
                                factory.createIdentifier(elementVar),
                                factory.createIdentifier('setAttribute')
                            ),
                            undefined,
                            [
                                factory.createStringLiteral(prop.name),
                                prop.value as ts.Expression
                            ]
                        )
                    )
                )
            } else {
                // el.propName = value
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
        }
    })

    // Handle static text children
    if (elementIR.children.length > 0) {
        const staticChildren = this.generateChildren(
            elementIR.children,
            elementVar
        )
        statements.push(...staticChildren)
    }

    // Return element
    statements.push(
        factory.createReturnStatement(
            factory.createIdentifier(elementVar)
        )
    )

    // Wrap in IIFE: (() => { const el = ...; return el })()
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
