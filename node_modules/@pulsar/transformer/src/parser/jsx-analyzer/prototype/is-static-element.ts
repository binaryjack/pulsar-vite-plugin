import * as ts from 'typescript'
import { IJSXAnalyzer } from '../jsx-analyzer.types'

/**
 * Determines if a JSX element is static (no dynamic props or children)
 */
export const isStaticElement = function(
    this: IJSXAnalyzer,
    node: ts.Node
): boolean {
    if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) {
        return false
    }
    
    // Check if tag name is static (not a variable or expression)
    const tagName = ts.isJsxElement(node) 
        ? node.openingElement.tagName 
        : node.tagName
        
    if (!ts.isIdentifier(tagName)) {
        return false
    }
    
    // Check if tag name starts with lowercase (HTML element, not component)
    const name = tagName.text
    if (name[0] !== name[0].toLowerCase()) {
        return false // Component, assume dynamic
    }
    
    // Check attributes
    const attributes = ts.isJsxElement(node)
        ? node.openingElement.attributes.properties
        : node.attributes.properties
        
    for (const attr of attributes) {
        if (ts.isJsxSpreadAttribute(attr)) {
            return false // Spread attributes are dynamic
        }
        
        if (ts.isJsxAttribute(attr)) {
            const initializer = attr.initializer
            if (!initializer) {
                continue // Boolean attribute like `disabled`
            }
            
            if (ts.isJsxExpression(initializer)) {
                if (initializer.expression) {
                    // Has expression, check if it's static
                    if (!this.isStaticValue(initializer.expression)) {
                        return false
                    }
                }
            } else if (!ts.isStringLiteral(initializer)) {
                return false // Unknown initializer type
            }
        }
    }
    
    // Check children (for JsxElement only)
    if (ts.isJsxElement(node)) {
        for (const child of node.children) {
            if (ts.isJsxText(child)) {
                continue // Text is static
            }
            
            if (ts.isJsxExpression(child)) {
                if (child.expression) {
                    if (!this.isStaticValue(child.expression)) {
                        return false
                    }
                } else {
                    // Empty expression {}
                    continue
                }
            } else if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
                // Recursively check child element
                if (!this.isStaticElement(child)) {
                    return false
                }
            } else if (ts.isJsxFragment(child)) {
                // Fragments can contain dynamic children
                return false
            }
        }
    }
    
    return true
}
