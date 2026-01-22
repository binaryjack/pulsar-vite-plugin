/**
 * Constant Folder
 * Replaces constant expressions with their literal values
 */

import * as ts from 'typescript';
import { extractConstantValue } from '../analyzers/constant-analyzer';

export interface IFoldingResult {
    foldedCount: number;
    bytesReduced: number;
}

/**
 * Folds constants in a source file
 */
export function foldConstants(
    sourceFile: ts.SourceFile,
    typeChecker: ts.TypeChecker,
    context: ts.TransformationContext
): { sourceFile: ts.SourceFile; result: IFoldingResult } {
    let foldedCount = 0;
    let bytesReduced = 0;

    const visitor = (node: ts.Node): ts.Node => {
        // Try to fold the node
        const constantValue = extractConstantValue(node, typeChecker);
        
        if (constantValue && shouldFold(node)) {
            const originalSize = node.getText().length;
            const folded = createLiteralFromValue(constantValue.value);
            const newSize = folded.getText().length;
            
            foldedCount++;
            bytesReduced += (originalSize - newSize);
            
            return folded;
        }

        return ts.visitEachChild(node, visitor, context);
    };

    const transformed = ts.visitNode(sourceFile, visitor) as ts.SourceFile;

    return {
        sourceFile: transformed,
        result: { foldedCount, bytesReduced }
    };
}

/**
 * Determines if a node should be folded
 */
function shouldFold(node: ts.Node): boolean {
    // Don't fold if already a simple literal
    if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
        return false;
    }

    // Don't fold if in type position
    const parent = node.parent;
    if (parent && (
        ts.isTypeNode(parent) ||
        ts.isTypeAliasDeclaration(parent) ||
        ts.isInterfaceDeclaration(parent)
    )) {
        return false;
    }

    // Don't fold if variable declaration initializer (keep source readable)
    if (parent && ts.isVariableDeclaration(parent) && parent.initializer === node) {
        // Only fold if the variable is used, not exported
        return false;
    }

    return true;
}

/**
 * Creates a literal node from a JavaScript value
 */
function createLiteralFromValue(value: unknown): ts.Expression {
    if (value === null) {
        return ts.factory.createNull();
    }

    if (value === true) {
        return ts.factory.createTrue();
    }

    if (value === false) {
        return ts.factory.createFalse();
    }

    if (typeof value === 'string') {
        return ts.factory.createStringLiteral(value);
    }

    if (typeof value === 'number') {
        return ts.factory.createNumericLiteral(value);
    }

    if (Array.isArray(value)) {
        const elements = value.map(v => createLiteralFromValue(v));
        return ts.factory.createArrayLiteralExpression(elements);
    }

    if (typeof value === 'object') {
        const properties: ts.PropertyAssignment[] = [];
        for (const [key, val] of Object.entries(value)) {
            properties.push(
                ts.factory.createPropertyAssignment(
                    ts.factory.createIdentifier(key),
                    createLiteralFromValue(val)
                )
            );
        }
        return ts.factory.createObjectLiteralExpression(properties);
    }

    // Fallback
    return ts.factory.createIdentifier('undefined');
}

/**
 * Folds constants in JSX attributes
 */
export function foldJSXConstants(
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    typeChecker: ts.TypeChecker
): ts.JsxElement | ts.JsxSelfClosingElement {
    // This would fold constants in JSX attribute values
    // For now, return as-is (will be implemented in phase 2)
    return node;
}
