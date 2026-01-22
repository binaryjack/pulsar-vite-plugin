import * as ts from 'typescript'
import { IJSXAnalyzer } from '../jsx-analyzer.types'

/**
 * Determines if an expression is static (literal value)
 */
export const isStaticValue = function(
    this: IJSXAnalyzer,
    expr: ts.Expression
): boolean {
    return ts.isStringLiteral(expr) ||
           ts.isNumericLiteral(expr) ||
           expr.kind === ts.SyntaxKind.TrueKeyword ||
           expr.kind === ts.SyntaxKind.FalseKeyword ||
           expr.kind === ts.SyntaxKind.NullKeyword
}
