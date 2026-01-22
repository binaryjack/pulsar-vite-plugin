// Export constructor
export { JSXAnalyzer } from './jsx-analyzer'

// Export types
export { SJSXAnalyzer } from './jsx-analyzer.types'
export type { IJSXAnalyzer } from './jsx-analyzer.types'

// Export prototype methods
export { analyze } from './prototype/analyze'
export { analyzeChildren } from './prototype/analyze-children'
export { analyzeProps } from './prototype/analyze-props'
export { extractDependencies } from './prototype/extract-dependencies'
export { extractEvents } from './prototype/extract-events'
export { isStaticElement } from './prototype/is-static-element'
export { isStaticValue } from './prototype/is-static-value'

// Export map pattern detection utilities
export { containsMapCall, detectArrayMapPattern, extractKeyFromJSX } from './prototype/map-pattern-detector'
export type { IArrayMapPattern } from './prototype/map-pattern-detector'

