import * as ts from 'typescript'
import { detectArrayMapPattern } from '../../../parser/jsx-analyzer/prototype/map-pattern-detector'
import { IElementGeneratorInternal } from '../element-generator.types'
import { generateKeyedReconciliation } from './generate-keyed-map'

/**
 * Generates code for appending children to an element
 * Handles text nodes, static elements, and dynamic expressions
 */
export const generateChildren = function(
    this: IElementGeneratorInternal,
    children: any[],
    parentVar: string
): ts.Statement[] {
    const factory = ts.factory
    const statements: ts.Statement[] = []

    children.forEach(child => {
        if (child.type === 'text') {
            // Static text: parent.appendChild(document.createTextNode('text'))
            statements.push(
                factory.createExpressionStatement(
                    factory.createCallExpression(
                        factory.createPropertyAccessExpression(
                            factory.createIdentifier(parentVar),
                            factory.createIdentifier('appendChild')
                        ),
                        undefined,
                        [
                            factory.createCallExpression(
                                factory.createPropertyAccessExpression(
                                    factory.createIdentifier('document'),
                                    factory.createIdentifier('createTextNode')
                                ),
                                undefined,
                                [factory.createStringLiteral(child.content)]
                            )
                        ]
                    )
                )
            )
        } else if (child.type === 'expression') {
            // Transform any JSX inside the expression first
            const transformedExpression = this.context.jsxVisitor 
                ? ts.visitNode(child.expression, this.context.jsxVisitor) as ts.Expression
                : child.expression as ts.Expression
            
            // 🎯 DETECT ARRAY.MAP() PATTERN FOR FINE-GRAINED REACTIVITY
            const mapPattern = detectArrayMapPattern(transformedExpression)
            
            if (mapPattern.isMapCall) {
                // Use keyed reconciliation for fine-grained updates
                const reconciliationCode = generateKeyedReconciliation({
                    mapPattern,
                    parentVar,
                    varCounter: (this as any).varCounter++,
                    elementGenerator: this
                })
                
                // Append the reconciliation container to parent
                statements.push(
                    factory.createExpressionStatement(
                        factory.createCallExpression(
                            factory.createPropertyAccessExpression(
                                factory.createIdentifier(parentVar),
                                factory.createIdentifier('appendChild')
                            ),
                            undefined,
                            [reconciliationCode]
                        )
                    )
                )
                return // Skip the old array handling below
            }
            
            if (child.isStatic) {
                // Static expression: wrap in text node and append
                // parent.appendChild(document.createTextNode(String(expr)))
                statements.push(
                    factory.createExpressionStatement(
                        factory.createCallExpression(
                            factory.createPropertyAccessExpression(
                                factory.createIdentifier(parentVar),
                                factory.createIdentifier('appendChild')
                            ),
                            undefined,
                            [
                                factory.createCallExpression(
                                    factory.createPropertyAccessExpression(
                                        factory.createIdentifier('document'),
                                        factory.createIdentifier('createTextNode')
                                    ),
                                    undefined,
                                    [
                                        factory.createCallExpression(
                                            factory.createIdentifier('String'),
                                            undefined,
                                            [transformedExpression]
                                        )
                                    ]
                                )
                            ]
                        )
                    )
                )
            } else {
                // Dynamic expression: wrap in createEffect
                // For array expressions (like .map()), we need special handling
                // createEffect(() => {
                //     const result = expr()
                //     if (Array.isArray(result)) {
                //         parent.innerHTML = ''
                //         result.forEach(el => parent.appendChild(el))
                //     } else {
                //         parent.textContent = result
                //     }
                // })
                statements.push(
                    factory.createExpressionStatement(
                        factory.createCallExpression(
                            factory.createIdentifier('createEffect'),
                            undefined,
                            [
                                factory.createArrowFunction(
                                    undefined,
                                    undefined,
                                    [],
                                    undefined,
                                    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                                    factory.createBlock(
                                        [
                                            // const result = expr()
                                            factory.createVariableStatement(
                                                undefined,
                                                factory.createVariableDeclarationList(
                                                    [
                                                        factory.createVariableDeclaration(
                                                            factory.createIdentifier('result'),
                                                            undefined,
                                                            undefined,
                                                            transformedExpression
                                                        )
                                                    ],
                                                    ts.NodeFlags.Const
                                                )
                                            ),
                                            // if (Array.isArray(result))
                                            factory.createIfStatement(
                                                factory.createCallExpression(
                                                    factory.createPropertyAccessExpression(
                                                        factory.createIdentifier('Array'),
                                                        factory.createIdentifier('isArray')
                                                    ),
                                                    undefined,
                                                    [factory.createIdentifier('result')]
                                                ),
                                                // then: clear and append each
                                                factory.createBlock([
                                                    factory.createExpressionStatement(
                                                        factory.createBinaryExpression(
                                                            factory.createPropertyAccessExpression(
                                                                factory.createIdentifier(parentVar),
                                                                factory.createIdentifier('innerHTML')
                                                            ),
                                                            factory.createToken(ts.SyntaxKind.EqualsToken),
                                                            factory.createStringLiteral('')
                                                        )
                                                    ),
                                                    factory.createExpressionStatement(
                                                        factory.createCallExpression(
                                                            factory.createPropertyAccessExpression(
                                                                factory.createIdentifier('result'),
                                                                factory.createIdentifier('forEach')
                                                            ),
                                                            undefined,
                                                            [
                                                                factory.createArrowFunction(
                                                                    undefined,
                                                                    undefined,
                                                                    [
                                                                        factory.createParameterDeclaration(
                                                                            undefined,
                                                                            undefined,
                                                                            factory.createIdentifier('el')
                                                                        )
                                                                    ],
                                                                    undefined,
                                                                    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                                                                    factory.createCallExpression(
                                                                        factory.createPropertyAccessExpression(
                                                                            factory.createIdentifier(parentVar),
                                                                            factory.createIdentifier('appendChild')
                                                                        ),
                                                                        undefined,
                                                                        [factory.createIdentifier('el')]
                                                                    )
                                                                )
                                                            ]
                                                        )
                                                    )
                                                ], true),
                                                // else: set textContent
                                                factory.createBlock([
                                                    factory.createExpressionStatement(
                                                        factory.createBinaryExpression(
                                                            factory.createPropertyAccessExpression(
                                                                factory.createIdentifier(parentVar),
                                                                factory.createIdentifier('textContent')
                                                            ),
                                                            factory.createToken(ts.SyntaxKind.EqualsToken),
                                                            factory.createIdentifier('result')
                                                        )
                                                    )
                                                ], true)
                                            )
                                        ],
                                        true
                                    )
                                )
                            ]
                        )
                    )
                )
            }
        } else if (child.type === 'element') {
            // Nested element: recursively generate and append
            const childElement = this.generate(child)
            statements.push(
                factory.createExpressionStatement(
                    factory.createCallExpression(
                        factory.createPropertyAccessExpression(
                            factory.createIdentifier(parentVar),
                            factory.createIdentifier('appendChild')
                        ),
                        undefined,
                        [childElement]
                    )
                )
            )
        }
    })

    return statements
}
