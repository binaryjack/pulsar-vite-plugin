import * as ts from 'typescript'
import { IJSXElementIR } from '../../../ir/types'
import { IElementGenerator } from '../element-generator.types'

/**
 * Generates code for dynamic property updates wrapped in createEffect
 * Example output:
 *   createEffect(() => {
 *       el.className = computeClass()
 *   })
 */
export const generateDynamicProps = function(
    this: IElementGenerator,
    elementVar: string,
    elementIR: IJSXElementIR
): ts.Statement[] {
    const factory = ts.factory
    const statements: ts.Statement[] = []

    // Get all dynamic properties (excluding events and ref)
    const dynamicProps = elementIR.props.filter(
        prop =>
            prop.isDynamic &&
            !prop.name.startsWith('on') &&
            prop.name !== 'ref' &&
            prop.value
    )

    if (dynamicProps.length === 0) {
        return statements
    }

    // Generate createEffect for each dynamic property
    dynamicProps.forEach(prop => {
        // Check if prop name has hyphens (like aria-label) - use setAttribute
        const hasHyphen = prop.name.includes('-')
        
        let assignmentExpr: ts.Expression
        
        if (hasHyphen) {
            // Use setAttribute for hyphenated attributes
            // el.setAttribute('aria-label', value())
            assignmentExpr = factory.createCallExpression(
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
        } else {
            // Use property assignment for regular properties
            // el.propName = value()
            assignmentExpr = factory.createBinaryExpression(
                factory.createPropertyAccessExpression(
                    factory.createIdentifier(elementVar),
                    factory.createIdentifier(prop.name)
                ),
                factory.createToken(ts.SyntaxKind.EqualsToken),
                prop.value as ts.Expression
            )
        }
        
        // createEffect(() => { ... })
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
                                    factory.createExpressionStatement(assignmentExpr)
                                ],
                                true
                            )
                        )
                    ]
                )
            )
        )
    })

    return statements
}
