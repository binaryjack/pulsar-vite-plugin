import * as ts from 'typescript'
import { IJSXElementIR } from '../../../ir/types'
import { IElementGenerator } from '../element-generator.types'

/**
 * Generates code for attaching event listeners
 * Example output:
 *   el.addEventListener('click', (e) => handleClick(e))
 */
export const generateEventListeners = function(
    this: IElementGenerator,
    elementVar: string,
    elementIR: IJSXElementIR
): ts.Statement[] {
    const factory = ts.factory
    const statements: ts.Statement[] = []

    if (!elementIR.events || elementIR.events.length === 0) {
        return statements
    }

    elementIR.events.forEach(event => {
        // el.addEventListener('click', handler)
        statements.push(
            factory.createExpressionStatement(
                factory.createCallExpression(
                    factory.createPropertyAccessExpression(
                        factory.createIdentifier(elementVar),
                        factory.createIdentifier('addEventListener')
                    ),
                    undefined,
                    [
                        factory.createStringLiteral(event.type),
                        event.handler as ts.Expression
                    ]
                )
            )
        )

        // TODO: Handle event modifiers (passive, capture, once)
        // if (event.modifiers) { ... }
    })

    return statements
}
