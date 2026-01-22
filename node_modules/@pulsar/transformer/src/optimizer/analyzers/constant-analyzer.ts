/**
 * Constant Analyzer
 * Detects compile-time constants that can be folded
 */

import * as ts from 'typescript';

export interface IConstantValue {
    node: ts.Node;
    value: unknown;
    type: 'primitive' | 'object' | 'array';
}

/**
 * Analyzes if a node represents a compile-time constant
 */
export function isConstant(node: ts.Node, typeChecker: ts.TypeChecker): boolean {
    // Primitives
    if (ts.isStringLiteral(node) || ts.isNumericLiteral(node) || 
        node.kind === ts.SyntaxKind.TrueKeyword || 
        node.kind === ts.SyntaxKind.FalseKeyword ||
        node.kind === ts.SyntaxKind.NullKeyword) {
        return true;
    }

    // Template literals without expressions
    if (ts.isTemplateExpression(node)) {
        return node.templateSpans.every(span => 
            ts.isStringLiteral(span.expression) || 
            ts.isNumericLiteral(span.expression)
        );
    }

    // Object literals with constant properties
    if (ts.isObjectLiteralExpression(node)) {
        return node.properties.every(prop => {
            if (ts.isPropertyAssignment(prop)) {
                return isConstant(prop.initializer, typeChecker);
            }
            return false;
        });
    }

    // Array literals with constant elements
    if (ts.isArrayLiteralExpression(node)) {
        return node.elements.every(el => isConstant(el, typeChecker));
    }

    // Variable references to const declarations
    if (ts.isIdentifier(node)) {
        const symbol = typeChecker.getSymbolAtLocation(node);
        if (symbol && symbol.valueDeclaration) {
            const decl = symbol.valueDeclaration;
            
            if (ts.isVariableDeclaration(decl)) {
                const parent = decl.parent;
                if (ts.isVariableDeclarationList(parent)) {
                    // Check if it's const
                    if (parent.flags & ts.NodeFlags.Const && decl.initializer) {
                        return isConstant(decl.initializer, typeChecker);
                    }
                }
            }
        }
    }

    // Property access on constant objects
    if (ts.isPropertyAccessExpression(node)) {
        return isConstant(node.expression, typeChecker);
    }

    return false;
}

/**
 * Extracts the constant value from a node
 */
export function extractConstantValue(node: ts.Node, typeChecker: ts.TypeChecker): IConstantValue | null {
    if (!isConstant(node, typeChecker)) {
        return null;
    }

    // String literal
    if (ts.isStringLiteral(node)) {
        return {
            node,
            value: node.text,
            type: 'primitive'
        };
    }

    // Numeric literal
    if (ts.isNumericLiteral(node)) {
        return {
            node,
            value: parseFloat(node.text),
            type: 'primitive'
        };
    }

    // Boolean
    if (node.kind === ts.SyntaxKind.TrueKeyword) {
        return { node, value: true, type: 'primitive' };
    }
    if (node.kind === ts.SyntaxKind.FalseKeyword) {
        return { node, value: false, type: 'primitive' };
    }

    // Null
    if (node.kind === ts.SyntaxKind.NullKeyword) {
        return { node, value: null, type: 'primitive' };
    }

    // Object literal
    if (ts.isObjectLiteralExpression(node)) {
        const obj: Record<string, unknown> = {};
        for (const prop of node.properties) {
            if (ts.isPropertyAssignment(prop)) {
                const name = prop.name.getText();
                const value = extractConstantValue(prop.initializer, typeChecker);
                if (value) {
                    obj[name] = value.value;
                }
            }
        }
        return {
            node,
            value: obj,
            type: 'object'
        };
    }

    // Array literal
    if (ts.isArrayLiteralExpression(node)) {
        const arr: unknown[] = [];
        for (const el of node.elements) {
            const value = extractConstantValue(el, typeChecker);
            if (value) {
                arr.push(value.value);
            }
        }
        return {
            node,
            value: arr,
            type: 'array'
        };
    }

    // Variable reference - resolve to initializer
    if (ts.isIdentifier(node)) {
        const symbol = typeChecker.getSymbolAtLocation(node);
        if (symbol && symbol.valueDeclaration) {
            const decl = symbol.valueDeclaration;
            if (ts.isVariableDeclaration(decl) && decl.initializer) {
                return extractConstantValue(decl.initializer, typeChecker);
            }
        }
    }

    // Property access - resolve through object
    if (ts.isPropertyAccessExpression(node)) {
        const objValue = extractConstantValue(node.expression, typeChecker);
        if (objValue && objValue.type === 'object') {
            const propName = node.name.text;
            const obj = objValue.value as Record<string, unknown>;
            if (propName in obj) {
                return {
                    node,
                    value: obj[propName],
                    type: 'primitive'
                };
            }
        }
    }

    return null;
}
