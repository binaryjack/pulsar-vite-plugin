import * as ts from 'typescript'
import { ITransformationContext } from '../transformation-context.types'

/**
 * Check if a node represents a state/signal access (function call)
 * Examples: count(), name(), user().email
 */
export const isStateAccess = function(
    this: ITransformationContext,
    node: ts.Node
): boolean {
    // Check if it's a call expression
    if (!ts.isCallExpression(node)) {
        return false
    }

    // Check if it has no arguments (getter pattern)
    if (node.arguments.length > 0) {
        return false
    }

    // Could enhance with type checking to verify it's actually a signal
    // For now, assume any no-arg call could be a signal getter
    return true
}
