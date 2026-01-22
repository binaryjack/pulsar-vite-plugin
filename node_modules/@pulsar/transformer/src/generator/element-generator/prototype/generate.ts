import * as ts from 'typescript'
import { IElementGenerator } from '../element-generator.types'

/**
 * Main entry point for generating code from JSX element IR
 * Determines if element is static or dynamic and delegates appropriately
 */
export const generate = function(
    this: IElementGenerator,
    elementIR: any
): ts.Expression {
    // Handle fragments (<></>)
    if (elementIR.type === 'fragment') {
        return this.generateFragment(elementIR)
    }
    
    // Handle component calls (e.g., <Counter />)
    if (elementIR.type === 'component') {
        return this.generateComponentCall(elementIR)
    }

    // Check if element has any dynamic aspects
    const hasDynamicProps = elementIR.props.some((prop: any) => prop.isDynamic)
    const hasDynamicChildren = elementIR.hasDynamicChildren
    const hasEvents = elementIR.events && elementIR.events.length > 0

    // If element is completely static, generate simple createElement
    if (!hasDynamicProps && !hasDynamicChildren && !hasEvents) {
        return this.generateStaticElement(elementIR)
    }

    // Element has dynamic aspects, generate with effects
    return this.generateDynamicElement(elementIR)
}
