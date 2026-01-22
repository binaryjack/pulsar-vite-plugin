import * as ts from 'typescript'
import { IJSXAnalyzer } from '../jsx-analyzer.types'

/**
 * Determines if a tag name represents a component (starts with uppercase)
 */
function isComponentTag(tagName: string): boolean {
    return tagName.length > 0 && tagName[0] === tagName[0].toUpperCase()
}

/**
 * Gets the tag name from a JSX tag name node
 */
function getTagName(tagName: ts.JsxTagNameExpression): { text: string; expression: ts.JsxTagNameExpression } {
    if (ts.isIdentifier(tagName)) {
        return { text: tagName.text, expression: tagName }
    }
    if (ts.isPropertyAccessExpression(tagName)) {
        // For AppContext.Provider, get just "Provider"
        if (ts.isIdentifier(tagName.name)) {
            return { text: tagName.name.text, expression: tagName }
        }
    }
    return { text: 'unknown', expression: tagName }
}

/**
 * Analyzes a JSX node and returns its intermediate representation
 */
export const analyze = function(this: IJSXAnalyzer, node: ts.Node): any {
    // Handle JSX Fragments (<></>)
    if (ts.isJsxFragment(node)) {
        return {
            type: 'fragment',
            children: this.analyzeChildren(node.children)
        }
    }
    
    if (ts.isJsxElement(node)) {
        const openingElement = node.openingElement
        const { text: tagName, expression: tagExpression } = getTagName(openingElement.tagName)
        
        // If it's a component (starts with uppercase), return function call
        if (isComponentTag(tagName)) {
            return {
                type: 'component',
                component: tagExpression,
                props: this.analyzeProps(openingElement.attributes),
                children: this.analyzeChildren(node.children)
            }
        }
        
        return {
            type: 'element',
            tag: tagName,
            props: this.analyzeProps(openingElement.attributes),
            children: this.analyzeChildren(node.children),
            isStatic: this.isStaticElement(node),
            hasDynamicChildren: node.children.some(child =>
                ts.isJsxExpression(child) && child.expression
            ),
            events: this.extractEvents(openingElement.attributes),
            key: null
        }
    }
    
    if (ts.isJsxSelfClosingElement(node)) {
        const { text: tagName, expression: tagExpression } = getTagName(node.tagName)
        
        // If it's a component (starts with uppercase), return function call
        if (isComponentTag(tagName)) {
            return {
                type: 'component',
                component: tagExpression,
                props: this.analyzeProps(node.attributes),
                children: []
            }
        }
        
        return {
            type: 'element',
            tag: tagName,
            props: this.analyzeProps(node.attributes),
            children: [],
            isStatic: this.isStaticElement(node),
            hasDynamicChildren: false,
            events: this.extractEvents(node.attributes),
            key: null
        }
    }
    
    return null
}
