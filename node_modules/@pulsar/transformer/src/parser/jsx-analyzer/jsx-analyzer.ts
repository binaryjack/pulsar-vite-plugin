import { ITransformationContext } from '../../context/transformation-context.types'
import { IJSXAnalyzer } from './jsx-analyzer.types'

// Import prototype methods
import { analyze } from './prototype/analyze'
import { analyzeChildren } from './prototype/analyze-children'
import { analyzeProps } from './prototype/analyze-props'
import { extractDependencies } from './prototype/extract-dependencies'
import { extractEvents } from './prototype/extract-events'

import { isStaticElement } from './prototype/is-static-element'
import { isStaticValue } from './prototype/is-static-value'

/**
 * JSXAnalyzer constructor function (prototype-based class)
 * Analyzes JSX AST nodes and extracts component structure
 */
export const JSXAnalyzer = function(
    this: IJSXAnalyzer,
    context: ITransformationContext
) {
    Object.defineProperty(this, 'context', {
        value: context,
        writable: false,
        configurable: false,
        enumerable: true
    })
} as any as { new (context: ITransformationContext): IJSXAnalyzer }

// Attach prototype methods
Object.assign(JSXAnalyzer.prototype, {
    analyze,
    analyzeProps,
    analyzeChildren,
    isStaticElement,
    isStaticValue,
    extractDependencies,
    extractEvents
})
