import * as ts from 'typescript'
import { IElementGeneratorInternal } from '../element-generator.types'

/**
 * Generates a function call for component elements (e.g., <Counter initialCount={0} />)
 * Transforms into: Counter({ initialCount: 0, children: childrenElement })
 */
export const generateComponentCall = function(
    this: IElementGeneratorInternal,
    componentIR: any
): ts.Expression {
    const factory = ts.factory

    // Build props object
    const propsProperties: ts.ObjectLiteralElementLike[] = []

    // Add regular props
    componentIR.props.forEach((prop: any) => {
        try {
            // Skip props without values or expressions
            if (!prop.value && prop.value !== false && prop.value !== 0) {
                return
            }
            
            // Strict validation - ensure we have a valid TypeScript expression node
            const valueExpr = prop.value
            if (!valueExpr || typeof valueExpr !== 'object') {
                console.warn(`[generateComponentCall] Prop ${prop.name} has invalid value type:`, typeof valueExpr)
                return
            }
            
            // Check for .kind property which all TS nodes must have
            if (!('kind' in valueExpr) || typeof (valueExpr as any).kind !== 'number') {
                console.warn(`[generateComponentCall] Prop ${prop.name} missing or invalid .kind property`)
                return
            }
            
            // Wrap in try-catch to handle any edge cases
            const propAssignment = factory.createPropertyAssignment(
                factory.createIdentifier(prop.name),
                valueExpr as ts.Expression
            )
            propsProperties.push(propAssignment)
        } catch (error) {
            console.error(`[generateComponentCall] Error creating property assignment for ${prop.name}:`, error)
            // Skip this prop and continue
        }
    })

    // Add children if present
    if (componentIR.children && componentIR.children.length > 0) {
        // For a single child, pass it directly
        // For multiple children, wrap in a container
        let childrenExpression: ts.Expression

        if (componentIR.children.length === 1) {
            const child = componentIR.children[0]
            if (child.type === 'text') {
                childrenExpression = factory.createStringLiteral(child.content)
            } else if (child.type === 'expression') {
                // Visit the expression to transform any nested JSX
                const expr = child.expression as ts.Expression
                childrenExpression = this.context.jsxVisitor 
                    ? ts.visitNode(expr, this.context.jsxVisitor) as ts.Expression
                    : expr
            } else {
                // Recursively generate child element
                childrenExpression = this.generate(child)
            }
        } else {
            // Multiple children - create a container div
            const statements: ts.Statement[] = []
            const containerVar = `container${(this as any).varCounter++}`

            statements.push(
                factory.createVariableStatement(
                    undefined,
                    factory.createVariableDeclarationList(
                        [
                            factory.createVariableDeclaration(
                                factory.createIdentifier(containerVar),
                                undefined,
                                undefined,
                                factory.createCallExpression(
                                    factory.createPropertyAccessExpression(
                                        factory.createIdentifier('document'),
                                        factory.createIdentifier('createElement')
                                    ),
                                    undefined,
                                    [factory.createStringLiteral('div')]
                                )
                            )
                        ],
                        ts.NodeFlags.Const
                    )
                )
            )

            // Append each child
            componentIR.children.forEach((child: any) => {
                let childExpr: ts.Expression
                if (child.type === 'text') {
                    childExpr = factory.createCallExpression(
                        factory.createPropertyAccessExpression(
                            factory.createIdentifier('document'),
                            factory.createIdentifier('createTextNode')
                        ),
                        undefined,
                        [factory.createStringLiteral(child.content)]
                    )
                } else if (child.type === 'expression') {
                    // Visit the expression to transform any nested JSX
                    const expr = child.expression as ts.Expression
                    childExpr = this.context.jsxVisitor 
                        ? ts.visitNode(expr, this.context.jsxVisitor) as ts.Expression
                        : expr
                } else {
                    childExpr = this.generate(child)
                }

                statements.push(
                    factory.createExpressionStatement(
                        factory.createCallExpression(
                            factory.createPropertyAccessExpression(
                                factory.createIdentifier(containerVar),
                                factory.createIdentifier('appendChild')
                            ),
                            undefined,
                            [childExpr]
                        )
                    )
                )
            })

            statements.push(
                factory.createReturnStatement(
                    factory.createIdentifier(containerVar)
                )
            )

            childrenExpression = factory.createCallExpression(
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

        propsProperties.push(
            factory.createPropertyAssignment(
                factory.createIdentifier('children'),
                childrenExpression
            )
        )
    }

    // Generate component call: ComponentName({ prop1: value1, ... })
    return factory.createCallExpression(
        componentIR.component as ts.Expression,
        undefined,
        [factory.createObjectLiteralExpression(propsProperties, propsProperties.length > 1)]
    )
}
