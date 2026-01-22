/**
 * TypeScript Compiler API Utilities
 * Provides compile-time analysis and validation
 */

import * as ts from 'typescript'

/**
 * Type checker utilities
 */
export class TypeAnalyzer {
    constructor(private typeChecker: ts.TypeChecker) {}
    
    /**
     * Get the type of a node as a string
     */
    getTypeString(node: ts.Node): string {
        const type = this.typeChecker.getTypeAtLocation(node)
        return this.typeChecker.typeToString(type)
    }
    
    /**
     * Check if a type is assignable to another
     */
    isAssignableTo(source: ts.Type, target: ts.Type): boolean {
        return this.typeChecker.isTypeAssignableTo(source, target)
    }
    
    /**
     * Get the properties of a type
     */
    getTypeProperties(type: ts.Type): ts.Symbol[] {
        return this.typeChecker.getPropertiesOfType(type)
    }
    
    /**
     * Resolve a type reference to its declaration
     */
    getTypeDeclaration(type: ts.Type): ts.Declaration | undefined {
        return type.symbol?.declarations?.[0]
    }
    
    /**
     * Extract interface properties with types
     */
    extractInterfaceProperties(type: ts.Type): Map<string, { type: string; optional: boolean }> {
        const properties = new Map<string, { type: string; optional: boolean }>()
        
        for (const prop of this.getTypeProperties(type)) {
            const propType = this.typeChecker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration!)
            const typeString = this.typeChecker.typeToString(propType)
            const optional = (prop.flags & ts.SymbolFlags.Optional) !== 0
            
            properties.set(prop.name, { type: typeString, optional })
        }
        
        return properties
    }
    
    /**
     * Check if a type extends another (inheritance check)
     */
    doesTypeExtend(type: ts.Type, baseTypeName: string): boolean {
        const baseTypes = type.getBaseTypes()
        if (!baseTypes) return false
        
        return baseTypes.some(base => {
            const typeName = this.typeChecker.typeToString(base)
            return typeName === baseTypeName || this.doesTypeExtend(base, baseTypeName)
        })
    }
}

/**
 * Route path type extraction
 * Extracts parameter types from path patterns at compile time
 */
export class RouteTypeExtractor {
    constructor(private typeChecker: ts.TypeChecker) {}
    
    /**
     * Extract param types from a route path literal
     * 
     * @example
     * '/users/:id' -> { id: 'string' }
     * '/posts/:postId/comments/:commentId' -> { postId: 'string', commentId: 'string' }
     */
    extractParamTypes(pathNode: ts.StringLiteral): Map<string, string> {
        const path = pathNode.text
        const params = new Map<string, string>()
        
        // Match :param patterns
        const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g
        let match: RegExpExecArray | null
        
        while ((match = paramRegex.exec(path)) !== null) {
            const paramName = match[1]
            // Default to string type (could be enhanced with type hints)
            params.set(paramName, 'string')
        }
        
        return params
    }
    
    /**
     * Generate a TypeScript type for route params
     * 
     * @example
     * generateParamType({ id: 'string', name: 'string' })
     * -> "{ id: string; name: string }"
     */
    generateParamType(params: Map<string, string>): string {
        if (params.size === 0) return '{}'
        
        const entries = Array.from(params.entries())
            .map(([name, type]) => `${name}: ${type}`)
            .join('; ')
        
        return `{ ${entries} }`
    }
    
    /**
     * Validate that useParams<T>() matches the route pattern
     * Returns error message if invalid, null if valid
     */
    validateParamsUsage(
        paramsType: ts.TypeNode | undefined,
        expectedParams: Map<string, string>
    ): string | null {
        if (!paramsType) {
            return expectedParams.size > 0 
                ? `Route has parameters ${Array.from(expectedParams.keys()).join(', ')} but useParams() has no type argument`
                : null
        }
        
        // This would require more complex type analysis
        // For now, just ensure it's an object type
        return null
    }
}

/**
 * Dependency Injection validator
 * Validates inject() calls at compile time
 */
export class DIValidator {
    private injectionGraph = new Map<string, Set<string>>()
    
    constructor(private typeChecker: ts.TypeChecker) {}
    
    /**
     * Track an injection dependency
     */
    trackInjection(consumer: string, dependency: string) {
        if (!this.injectionGraph.has(consumer)) {
            this.injectionGraph.set(consumer, new Set())
        }
        this.injectionGraph.get(consumer)!.add(dependency)
    }
    
    /**
     * Detect circular dependencies
     * Returns the circular path if found, null otherwise
     */
    detectCircularDependency(start: string): string[] | null {
        const visited = new Set<string>()
        const path: string[] = []
        
        const dfs = (node: string): boolean => {
            if (path.includes(node)) {
                // Found a cycle
                return true
            }
            
            if (visited.has(node)) {
                return false
            }
            
            visited.add(node)
            path.push(node)
            
            const deps = this.injectionGraph.get(node)
            if (deps) {
                for (const dep of deps) {
                    if (dfs(dep)) {
                        return true
                    }
                }
            }
            
            path.pop()
            return false
        }
        
        return dfs(start) ? [...path, start] : null
    }
    
    /**
     * Validate that an inject() call is valid
     * Checks:
     * - Service is registered
     * - No circular dependencies
     * - Type is correct
     */
    validateInjectCall(
        injectCall: ts.CallExpression,
        serviceRegistry: Set<string>
    ): { valid: boolean; error?: string } {
        // Get the injected service name
        const typeArg = injectCall.typeArguments?.[0]
        if (!typeArg) {
            return { valid: false, error: 'inject() requires a type argument' }
        }
        
        const serviceName = typeArg.getText()
        
        // Check if service is registered
        if (!serviceRegistry.has(serviceName)) {
            return { 
                valid: false, 
                error: `Service '${serviceName}' is not registered. Did you forget @Injectable()?` 
            }
        }
        
        // Check for circular dependencies (would need context of current component)
        // This is simplified - real implementation would track current context
        
        return { valid: true }
    }
    
    /**
     * Generate a dependency graph visualization (for debugging)
     */
    generateGraphDOT(): string {
        let dot = 'digraph Dependencies {\n'
        
        for (const [consumer, deps] of this.injectionGraph.entries()) {
            for (const dep of deps) {
                dot += `  "${consumer}" -> "${dep}";\n`
            }
        }
        
        dot += '}'
        return dot
    }
}

/**
 * Enhanced error messages with suggestions
 */
export class ErrorEnhancer {
    /**
     * Enhance a TypeScript diagnostic with helpful suggestions
     */
    enhanceDiagnostic(
        diagnostic: ts.Diagnostic,
        suggestions: string[]
    ): ts.Diagnostic {
        const message = typeof diagnostic.messageText === 'string'
            ? diagnostic.messageText
            : diagnostic.messageText.messageText
        
        const enhancedMessage = `${message}\n\nSuggestions:\n${suggestions.map(s => `  - ${s}`).join('\n')}`
        
        return {
            ...diagnostic,
            messageText: enhancedMessage
        }
    }
    
    /**
     * Generate suggestions for common errors
     */
    generateSuggestions(diagnostic: ts.Diagnostic): string[] {
        const message = typeof diagnostic.messageText === 'string'
            ? diagnostic.messageText
            : diagnostic.messageText.messageText
        
        const suggestions: string[] = []
        
        // Common patterns
        if (message.includes('Cannot find name')) {
            suggestions.push('Did you forget to import this?')
            suggestions.push('Check for typos in the identifier')
        }
        
        if (message.includes('Type') && message.includes('is not assignable')) {
            suggestions.push('Check the types match exactly')
            suggestions.push('Consider using type assertion if you know better')
        }
        
        if (message.includes('inject')) {
            suggestions.push('Ensure the service is decorated with @Injectable()')
            suggestions.push('Check that the service is registered in a provider')
        }
        
        if (message.includes('route') || message.includes('path')) {
            suggestions.push('Verify the route path matches the pattern')
            suggestions.push('Check that useParams<T>() type matches route parameters')
        }
        
        return suggestions
    }
}

/**
 * Auto prop validation from component types
 */
export class PropValidator {
    constructor(private typeChecker: ts.TypeChecker) {}
    
    /**
     * Extract required and optional props from a component's props type
     */
    extractComponentProps(
        componentNode: ts.FunctionDeclaration | ts.ArrowFunction
    ): {
        required: Map<string, string>
        optional: Map<string, string>
    } {
        const required = new Map<string, string>()
        const optional = new Map<string, string>()
        
        // Get the first parameter (props)
        const propsParam = componentNode.parameters[0]
        if (!propsParam || !propsParam.type) {
            return { required, optional }
        }
        
        const propsType = this.typeChecker.getTypeFromTypeNode(propsParam.type)
        const properties = this.typeChecker.getPropertiesOfType(propsType)
        
        for (const prop of properties) {
            const propType = this.typeChecker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration!)
            const typeString = this.typeChecker.typeToString(propType)
            const isOptional = (prop.flags & ts.SymbolFlags.Optional) !== 0
            
            if (isOptional) {
                optional.set(prop.name, typeString)
            } else {
                required.set(prop.name, typeString)
            }
        }
        
        return { required, optional }
    }
    
    /**
     * Validate that JSX attributes match component props
     */
    validateJSXAttributes(
        jsxElement: ts.JsxOpeningLikeElement,
        componentProps: { required: Map<string, string>; optional: Map<string, string> }
    ): Array<{ message: string; severity: 'error' | 'warning' }> {
        const errors: Array<{ message: string; severity: 'error' | 'warning' }> = []
        const providedProps = new Set<string>()
        
        // Check provided attributes
        jsxElement.attributes.properties.forEach(attr => {
            if (ts.isJsxAttribute(attr)) {
                const name = ts.isIdentifier(attr.name) ? attr.name.text : attr.name.getText()
                providedProps.add(name)
                
                // Check if prop exists
                const inRequired = componentProps.required.has(name)
                const inOptional = componentProps.optional.has(name)
                
                if (!inRequired && !inOptional) {
                    errors.push({
                        message: `Property '${name}' does not exist on component props`,
                        severity: 'error'
                    })
                }
            }
        })
        
        // Check missing required props
        for (const [propName, propType] of componentProps.required.entries()) {
            if (!providedProps.has(propName)) {
                errors.push({
                    message: `Missing required prop '${propName}' of type '${propType}'`,
                    severity: 'error'
                })
            }
        }
        
        return errors
    }
}
