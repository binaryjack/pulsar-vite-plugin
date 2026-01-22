/**
 * Prop Validation Integration
 * Automatically validate JSX props against TypeScript types
 */

import * as ts from 'typescript'

/**
 * Validate JSX element props against component prop types
 */
export function validateJSXProps(
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    context: TransformationContext
): ts.Diagnostic[] {
    const diagnostics: ts.Diagnostic[] = []
    
    // Get the component name
    const tagName = ts.isJsxElement(node) 
        ? node.openingElement.tagName
        : node.tagName
    
    if (!ts.isIdentifier(tagName)) {
        return diagnostics // Can't validate non-identifier components
    }
    
    const componentName = tagName.text
    
    // Find the component declaration
    const symbol = context.typeChecker.getSymbolAtLocation(tagName)
    if (!symbol) {
        return diagnostics // Component not found
    }
    
    const declaration = symbol.valueDeclaration
    if (!declaration) {
        return diagnostics
    }
    
    // Check if it's a function component
    if (ts.isFunctionDeclaration(declaration) || ts.isVariableDeclaration(declaration)) {
        const componentType = context.typeChecker.getTypeAtLocation(declaration)
        const signatures = componentType.getCallSignatures()
        
        if (signatures.length === 0) {
            return diagnostics
        }
        
        // Get the props parameter type
        const propsParam = signatures[0].getParameters()[0]
        if (!propsParam) {
            return diagnostics // No props
        }
        
        const propsType = context.typeChecker.getTypeOfSymbolAtLocation(
            propsParam,
            propsParam.valueDeclaration!
        )
        
        // Extract expected props
        const expectedProps = context.propValidator.extractInterfaceProperties(propsType)
        
        // Get provided props
        const attributes = ts.isJsxElement(node)
            ? node.openingElement.attributes
            : node.attributes
        
        const providedProps = new Set<string>()
        
        for (const attr of attributes.properties) {
            if (ts.isJsxAttribute(attr)) {
                const name = ts.isIdentifier(attr.name) ? attr.name.text : attr.name.getText()
                providedProps.add(name)
            } else if (ts.isJsxSpreadAttribute(attr)) {
                // Can't validate spread attributes
                return diagnostics
            }
        }
        
        // Check for missing required props
        for (const [propName, { type, optional }] of expectedProps.entries()) {
            if (!optional && !providedProps.has(propName)) {
                diagnostics.push({
                    file: context.sourceFile,
                    start: node.getStart(),
                    length: node.getWidth(),
                    messageText: `Missing required prop '${propName}' of type '${type}' in <${componentName} />`,
                    category: ts.DiagnosticCategory.Error,
                    code: 9002
                })
            }
        }
        
        // Check for unknown props
        for (const propName of providedProps) {
            if (!expectedProps.has(propName)) {
                const attr = attributes.properties.find(p => 
                    ts.isJsxAttribute(p) && 
                    ts.isIdentifier(p.name) && 
                    p.name.text === propName
                )
                
                if (attr) {
                    diagnostics.push({
                        file: context.sourceFile,
                        start: attr.getStart(),
                        length: attr.getWidth(),
                        messageText: `Property '${propName}' does not exist on component '${componentName}'`,
                        category: ts.DiagnosticCategory.Error,
                        code: 9003
                    })
                }
            }
        }
    }
    
    return diagnostics
}

/**
 * Enable prop validation in transformer
 */
export function enablePropValidation(
    context: TransformationContext,
    onDiagnostic: (diagnostic: ts.Diagnostic) => void
): ts.Visitor {
    return (node: ts.Node): ts.VisitResult<ts.Node> => {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
            const diagnostics = validateJSXProps(node, context)
            diagnostics.forEach(onDiagnostic)
        }
        
        return ts.visitEachChild(node, enablePropValidation(context, onDiagnostic), context.context)
    }
}
