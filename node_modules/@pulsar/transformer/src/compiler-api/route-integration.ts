/**
 * Route Type Integration
 * Automatically extract and validate route parameter types
 */

import * as ts from 'typescript';

/**
 * Detect Route component usage and extract path patterns
 */
export function analyzeRouteComponent(
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    context: TransformationContext
): { path?: string; hasParams: boolean } | null {
    const tagName = ts.isJsxElement(node) 
        ? node.openingElement.tagName
        : node.tagName
    
    if (!ts.isIdentifier(tagName) || tagName.text !== 'Route') {
        return null
    }
    
    // Find path attribute
    const attributes = ts.isJsxElement(node)
        ? node.openingElement.attributes
        : node.attributes
    
    let path: string | undefined
    
    for (const attr of attributes.properties) {
        if (ts.isJsxAttribute(attr)) {
            const name = ts.isIdentifier(attr.name) ? attr.name.text : attr.name.getText()
            
            if (name === 'path' && attr.initializer) {
                if (ts.isStringLiteral(attr.initializer)) {
                    path = attr.initializer.text
                } else if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
                    if (ts.isStringLiteral(attr.initializer.expression)) {
                        path = attr.initializer.expression.text
                    }
                }
            }
        }
    }
    
    if (!path) {
        return null
    }
    
    // Check if path has parameters
    const hasParams = /:([a-zA-Z_][a-zA-Z0-9_]*)/.test(path)
    
    return { path, hasParams }
}

/**
 * Validate useParams() calls against route patterns
 */
export function validateUseParamsCall(
    callExpr: ts.CallExpression,
    context: TransformationContext
): ts.Diagnostic[] {
    const diagnostics: ts.Diagnostic[] = []
    
    // Check if it's useParams()
    if (!ts.isIdentifier(callExpr.expression) || callExpr.expression.text !== 'useParams') {
        return diagnostics
    }
    
    // Get type argument
    const typeArgs = callExpr.typeArguments
    if (!typeArgs || typeArgs.length === 0) {
        // No type argument, can't validate
        return diagnostics
    }
    
    const typeArg = typeArgs[0]
    
    // Extract expected param types from type argument
    if (ts.isTypeLiteralNode(typeArg)) {
        const expectedParams = new Map<string, string>()
        
        for (const member of typeArg.members) {
            if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
                const paramName = member.name.text
                const paramType = member.type ? member.type.getText() : 'unknown'
                expectedParams.set(paramName, paramType)
            }
        }
        
        // TODO: Find the actual route pattern and validate
        // This would require tracking route definitions in the file
        // For now, just validate the structure
        
        if (expectedParams.size === 0) {
            diagnostics.push({
                file: context.sourceFile,
                start: callExpr.getStart(),
                length: callExpr.getWidth(),
                messageText: 'useParams() type argument is empty. Did you forget to specify parameter types?',
                category: ts.DiagnosticCategory.Warning,
                code: 9001
            })
        }
    }
    
    return diagnostics
}

/**
 * Generate route type definitions
 */
export function generateRouteTypes(
    routes: Map<string, string>
): string {
    let output = '// Auto-generated route types\n\n'
    
    for (const [routeName, path] of routes.entries()) {
        const params = extractParamsFromPath(path)
        
        if (params.length > 0) {
            const paramTypes = params.map(p => `${p}: string`).join('; ')
            output += `export type ${routeName}Params = { ${paramTypes} }\n`
        }
    }
    
    return output
}

function extractParamsFromPath(path: string): string[] {
    const params: string[] = []
    const regex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g
    let match: RegExpExecArray | null
    
    while ((match = regex.exec(path)) !== null) {
        params.push(match[1])
    }
    
    return params
}
