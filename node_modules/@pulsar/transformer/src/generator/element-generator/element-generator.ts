import { ITransformationContext } from '../../context/transformation-context.types'
import { IElementGeneratorInternal } from './element-generator.types'
import { generate } from './prototype/generate'
import { generateChildren } from './prototype/generate-children'
import { generateComponentCall } from './prototype/generate-component-call'
import { generateDynamicElement } from './prototype/generate-dynamic-element'
import { generateDynamicProps } from './prototype/generate-dynamic-props'
import { generateEventListeners } from './prototype/generate-event-listeners'
import { generateFragment } from './prototype/generate-fragment'
import { generateRefAssignment } from './prototype/generate-ref-assignment'
import { generateStaticElement } from './prototype/generate-static-element'

/**
 * Generates TypeScript AST nodes from JSX IR
 * Follows prototype-based pattern
 */
export const ElementGenerator = function(
    this: IElementGeneratorInternal,
    context: ITransformationContext
) {
    // Store the transformation context
    Object.defineProperty(this, 'context', {
        value: context,
        writable: false,
        configurable: false,
        enumerable: false
    })

    // Counter for unique variable names
    Object.defineProperty(this, 'varCounter', {
        value: 0,
        writable: true,
        configurable: false,
        enumerable: false
    })
} as any as { new (context: ITransformationContext): IElementGeneratorInternal }

// Attach prototype methods
Object.assign(ElementGenerator.prototype, {
    generate,
    generateStaticElement,
    generateDynamicElement,
    generateComponentCall,
    generateEventListeners,
    generateChildren,
    generateDynamicProps,
    generateFragment,
    generateRefAssignment
})
