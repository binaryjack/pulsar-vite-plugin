/**
 * DI Integration
 * Compile-time validation for dependency injection
 */

import * as ts from 'typescript'

/**
 * Validate inject() calls
 */
export function validateInjectCalls(
    sourceFile: ts.SourceFile,
    context: TransformationContext
): ts.Diagnostic[] {
    const diagnostics: ts.Diagnostic[] = []
    const serviceRegistry = new Set<string>()
    
    // First pass: collect all @Injectable services
    function collectServices(node: ts.Node): void {
        if (ts.isClassDeclaration(node) && node.name) {
            const decorators = ts.getDecorators(node)
            if (decorators) {
                for (const decorator of decorators) {
                    if (ts.isCallExpression(decorator.expression)) {
                        const expr = decorator.expression.expression
                        if (ts.isIdentifier(expr) && expr.text === 'Injectable') {
                            serviceRegistry.add(node.name.text)
                        }
                    }
                }
            }
        }
        
        ts.forEachChild(node, collectServices)
    }
    
    collectServices(sourceFile)
    
    // Second pass: validate inject() calls
    function validateNode(node: ts.Node): void {
        if (ts.isCallExpression(node)) {
            if (ts.isIdentifier(node.expression) && node.expression.text === 'inject') {
                // Get the type argument
                const typeArgs = node.typeArguments
                if (typeArgs && typeArgs.length > 0) {
                    const typeArg = typeArgs[0]
                    if (ts.isTypeReferenceNode(typeArg) && ts.isIdentifier(typeArg.typeName)) {
                        const serviceName = typeArg.typeName.text
                        
                        // Check if service is registered
                        if (!serviceRegistry.has(serviceName)) {
                            diagnostics.push({
                                file: sourceFile,
                                start: node.getStart(),
                                length: node.getWidth(),
                                messageText: `Service '${serviceName}' is not registered. Did you forget @Injectable()?`,
                                category: ts.DiagnosticCategory.Error,
                                code: 9004
                            })
                        }
                        
                        // Track for circular dependency detection
                        // Would need more context to implement fully
                    }
                }
            }
        }
        
        ts.forEachChild(node, validateNode)
    }
    
    validateNode(sourceFile)
    
    return diagnostics
}

/**
 * Check for circular dependencies in DI
 */
export function checkCircularDependencies(
    sourceFile: ts.SourceFile,
    context: TransformationContext
): ts.Diagnostic[] {
    const diagnostics: ts.Diagnostic[] = []
    
    // Build dependency graph
    const graph = new Map<string, Set<string>>()
    
    function analyzeClass(node: ts.ClassDeclaration): void {
        if (!node.name) return
        
        const className = node.name.text
        const deps = new Set<string>()
        
        // Find constructor
        for (const member of node.members) {
            if (ts.isConstructorDeclaration(member)) {
                // Analyze constructor parameters
                for (const param of member.parameters) {
                    if (param.type && ts.isTypeReferenceNode(param.type)) {
                        if (ts.isIdentifier(param.type.typeName)) {
                            deps.add(param.type.typeName.text)
                        }
                    }
                }
            }
        }
        
        graph.set(className, deps)
    }
    
    // Collect all classes
    function visit(node: ts.Node): void {
        if (ts.isClassDeclaration(node)) {
            analyzeClass(node)
        }
        ts.forEachChild(node, visit)
    }
    
    visit(sourceFile)
    
    // Detect cycles using DFS
    for (const [className] of graph) {
        const cycle = context.diValidator.detectCircularDependency(className)
        if (cycle) {
            diagnostics.push({
                file: sourceFile,
                start: 0,
                length: 0,
                messageText: `Circular dependency detected: ${cycle.join(' → ')}`,
                category: ts.DiagnosticCategory.Error,
                code: 9005
            })
        }
    }
    
    return diagnostics
}
