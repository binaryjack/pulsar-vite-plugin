import * as ts from 'typescript'
import { IElementGenerator } from '../element-generator.types'

/**
 * Generates code for ref assignment
 * Example output:
 *   if (ref && typeof ref === 'object' && 'current' in ref) {
 *       ref.current = el
 *   }
 */
export const generateRefAssignment = function(
    this: IElementGenerator,
    elementVar: string,
    refExpr: ts.Expression
): ts.Statement | null {
    const factory = ts.factory

    // Generate safe ref assignment with runtime check
    // if (ref && typeof ref === 'object' && 'current' in ref) {
    //     ref.current = el
    // }
    return factory.createIfStatement(
        factory.createBinaryExpression(
            factory.createBinaryExpression(
                refExpr,
                factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
                factory.createBinaryExpression(
                    factory.createTypeOfExpression(refExpr),
                    factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
                    factory.createStringLiteral('object')
                )
            ),
            factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
            factory.createBinaryExpression(
                factory.createStringLiteral('current'),
                factory.createToken(ts.SyntaxKind.InKeyword),
                refExpr
            )
        ),
        factory.createBlock(
            [
                factory.createExpressionStatement(
                    factory.createBinaryExpression(
                        factory.createPropertyAccessExpression(
                            refExpr,
                            factory.createIdentifier('current')
                        ),
                        factory.createToken(ts.SyntaxKind.EqualsToken),
                        factory.createIdentifier(elementVar)
                    )
                )
            ],
            true
        ),
        undefined
    )
}
