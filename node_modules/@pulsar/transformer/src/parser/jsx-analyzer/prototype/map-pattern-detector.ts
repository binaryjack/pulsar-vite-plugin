import * as ts from 'typescript'

/**
 * Utilities for detecting and analyzing array.map() patterns in JSX
 */

export interface IArrayMapPattern {
    isMapCall: boolean
    arrayExpression?: ts.Expression // The expression being mapped (e.g., items())
    mapCallback?: ts.ArrowFunction | ts.FunctionExpression // The callback function
    itemParam?: ts.ParameterDeclaration // The item parameter
    indexParam?: ts.ParameterDeclaration // The index parameter (if present)
    keyExpression?: ts.Expression // The key prop value (if present)
    returnedJSX?: ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment // The JSX returned by map
}

/**
 * Detects if an expression is an array.map() call
 * Matches patterns like: items().map(...), array.map(...), etc.
 */
export function detectArrayMapPattern(expression: ts.Expression): IArrayMapPattern {
    // Check if it's a call expression
    if (!ts.isCallExpression(expression)) {
        return { isMapCall: false }
    }

    const callExpr = expression
    
    // Check if it's a property access ending with 'map'
    if (!ts.isPropertyAccessExpression(callExpr.expression)) {
        return { isMapCall: false }
    }

    const propAccess = callExpr.expression
    if (propAccess.name.text !== 'map') {
        return { isMapCall: false }
    }

    // Get the array expression (the thing before .map)
    const arrayExpression = propAccess.expression

    // Get the callback function (first argument to .map)
    const args = callExpr.arguments
    if (args.length === 0) {
        return { isMapCall: false }
    }

    const callback = args[0]
    
    // Check if callback is an arrow function or function expression
    if (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) {
        return { isMapCall: false }
    }

    // Extract parameters
    const params = callback.parameters
    const itemParam = params[0]
    const indexParam = params.length > 1 ? params[1] : undefined

    // Try to extract the JSX returned by the callback
    let returnedJSX: ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment | undefined

    if (ts.isArrowFunction(callback)) {
        const body = callback.body
        
        // Arrow function with expression body: item => <div>...</div>
        if (ts.isJsxElement(body) || ts.isJsxSelfClosingElement(body) || ts.isJsxFragment(body)) {
            returnedJSX = body
        }
        // Arrow function with block body: item => { return <div>...</div> }
        else if (ts.isBlock(body)) {
            const returnStatement = body.statements.find(ts.isReturnStatement)
            if (returnStatement && returnStatement.expression) {
                const expr = returnStatement.expression
                if (ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr) || ts.isJsxFragment(expr)) {
                    returnedJSX = expr
                }
            }
        }
    }

    // Extract key prop if present
    let keyExpression: ts.Expression | undefined
    if (returnedJSX) {
        const attributes = ts.isJsxSelfClosingElement(returnedJSX)
            ? returnedJSX.attributes.properties
            : ts.isJsxElement(returnedJSX)
            ? returnedJSX.openingElement.attributes.properties
            : []

        for (const attr of attributes) {
            if (ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name) && attr.name.text === 'key') {
                if (attr.initializer && ts.isJsxExpression(attr.initializer)) {
                    keyExpression = attr.initializer.expression
                }
            }
        }
    }

    return {
        isMapCall: true,
        arrayExpression,
        mapCallback: callback,
        itemParam,
        indexParam,
        keyExpression,
        returnedJSX
    }
}

/**
 * Checks if an expression contains a .map() call anywhere in its tree
 */
export function containsMapCall(node: ts.Node): boolean {
    let found = false
    
    function visit(node: ts.Node) {
        if (found) return
        
        if (ts.isCallExpression(node) && 
            ts.isPropertyAccessExpression(node.expression) &&
            node.expression.name.text === 'map') {
            found = true
            return
        }
        
        ts.forEachChild(node, visit)
    }
    
    visit(node)
    return found
}

/**
 * Extracts the key expression from JSX attributes
 * Returns undefined if no key prop is found
 */
export function extractKeyFromJSX(
    node: ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment
): ts.Expression | undefined {
    if (ts.isJsxFragment(node)) {
        return undefined
    }

    const attributes = ts.isJsxSelfClosingElement(node)
        ? node.attributes.properties
        : node.openingElement.attributes.properties

    for (const attr of attributes) {
        if (ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name) && attr.name.text === 'key') {
            if (attr.initializer && ts.isJsxExpression(attr.initializer)) {
                return attr.initializer.expression
            }
        }
    }

    return undefined
}

/**
 * Generates a unique key extraction function name
 */
export function generateKeyExtractorName(counter: number): string {
    return `__keyExtractor${counter}`
}

/**
 * Checks if a key expression is simple (item.id, item['id'], etc.)
 */
export function isSimpleKeyExpression(keyExpr: ts.Expression, itemParamName: string): boolean {
    // item.id
    if (ts.isPropertyAccessExpression(keyExpr) &&
        ts.isIdentifier(keyExpr.expression) &&
        keyExpr.expression.text === itemParamName) {
        return true
    }

    // item['id']
    if (ts.isElementAccessExpression(keyExpr) &&
        ts.isIdentifier(keyExpr.expression) &&
        keyExpr.expression.text === itemParamName &&
        ts.isStringLiteral(keyExpr.argumentExpression)) {
        return true
    }

    // index (if keyExpr is just an identifier)
    if (ts.isIdentifier(keyExpr)) {
        return true
    }

    return false
}
