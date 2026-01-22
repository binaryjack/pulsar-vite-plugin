/**
 * Tree Shaking Utilities
 * Tracks component usage and eliminates dead code
 */

import * as ts from 'typescript'

export interface ComponentUsage {
    /**
     * Component name
     */
    name: string
    
    /**
     * File path where it's defined
     */
    definedIn: string
    
    /**
     * Files where it's used
     */
    usedIn: Set<string>
    
    /**
     * Is it exported
     */
    exported: boolean
    
    /**
     * Dependencies (other components it uses)
     */
    dependencies: Set<string>
}

/**
 * Tree shaking analyzer
 * Tracks which components are actually used
 */
export class TreeShakingAnalyzer {
    private components = new Map<string, ComponentUsage>()
    private entryPoints = new Set<string>()
    
    /**
     * Register an entry point file
     */
    addEntryPoint(filePath: string) {
        this.entryPoints.add(filePath)
    }
    
    /**
     * Track a component definition
     */
    trackComponent(
        name: string,
        filePath: string,
        options: {
            exported?: boolean
            dependencies?: string[]
        } = {}
    ) {
        if (!this.components.has(name)) {
            this.components.set(name, {
                name,
                definedIn: filePath,
                usedIn: new Set(),
                exported: options.exported || false,
                dependencies: new Set(options.dependencies || [])
            })
        }
    }
    
    /**
     * Track a component usage
     */
    trackUsage(componentName: string, usedInFile: string) {
        const component = this.components.get(componentName)
        if (component) {
            component.usedIn.add(usedInFile)
        }
    }
    
    /**
     * Get all components that can be eliminated
     */
    getUnusedComponents(): string[] {
        const used = new Set<string>()
        
        // Mark all components used in entry points
        const markUsed = (name: string) => {
            if (used.has(name)) return
            
            const component = this.components.get(name)
            if (!component) return
            
            used.add(name)
            
            // Recursively mark dependencies
            component.dependencies.forEach(dep => markUsed(dep))
        }
        
        // Start from entry points
        this.components.forEach((component, name) => {
            const usedInEntryPoint = Array.from(component.usedIn).some(file =>
                this.entryPoints.has(file)
            )
            
            if (usedInEntryPoint || component.exported) {
                markUsed(name)
            }
        })
        
        // Return unused components
        return Array.from(this.components.keys()).filter(name => !used.has(name))
    }
    
    /**
     * Generate a report
     */
    generateReport(): string {
        const unused = this.getUnusedComponents()
        const total = this.components.size
        const used = total - unused.length
        
        let report = `Tree Shaking Analysis Report\n`
        report += `==============================\n\n`
        report += `Total Components: ${total}\n`
        report += `Used Components: ${used}\n`
        report += `Unused Components: ${unused.length}\n`
        report += `Optimization Potential: ${((unused.length / total) * 100).toFixed(1)}%\n\n`
        
        if (unused.length > 0) {
            report += `Unused Components (can be eliminated):\n`
            unused.forEach(name => {
                const component = this.components.get(name)!
                report += `  - ${name} (${component.definedIn})\n`
            })
        }
        
        return report
    }
    
    /**
     * Generate a dependency graph in DOT format
     */
    generateDependencyGraph(): string {
        let dot = 'digraph ComponentDependencies {\n'
        dot += '  rankdir=LR;\n'
        dot += '  node [shape=box];\n\n'
        
        const unused = new Set(this.getUnusedComponents())
        
        this.components.forEach((component, name) => {
            // Color unused components red
            const color = unused.has(name) ? 'red' : 'black'
            const style = unused.has(name) ? ',style=dashed' : ''
            
            dot += `  "${name}" [color=${color}${style}];\n`
            
            component.dependencies.forEach(dep => {
                dot += `  "${name}" -> "${dep}";\n`
            })
        })
        
        dot += '}\n'
        return dot
    }
}

/**
 * Component usage tracker transformer
 * Tracks component definitions and usages during transformation
 */
export function createUsageTracker(): {
    analyzer: TreeShakingAnalyzer
    transformer: ts.TransformerFactory<ts.SourceFile>
} {
    const analyzer = new TreeShakingAnalyzer()
    
    const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
        return (sourceFile) => {
            const filePath = sourceFile.fileName
            
            const visitor: ts.Visitor = (node) => {
                // Track function components
                if (ts.isFunctionDeclaration(node) && node.name) {
                    const name = node.name.text
                    const exported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
                    
                    // Check if it returns JSX (simplified check)
                    const body = node.body
                    if (body && ts.isBlock(body)) {
                        const hasJSX = body.statements.some(stmt =>
                            ts.isReturnStatement(stmt) &&
                            stmt.expression &&
                            (ts.isJsxElement(stmt.expression) || ts.isJsxSelfClosingElement(stmt.expression))
                        )
                        
                        if (hasJSX) {
                            analyzer.trackComponent(name, filePath, { exported })
                        }
                    }
                }
                
                // Track JSX usage
                if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
                    const tagName = ts.isJsxOpeningElement(node)
                        ? node.tagName
                        : node.tagName
                    
                    if (ts.isIdentifier(tagName)) {
                        analyzer.trackUsage(tagName.text, filePath)
                    }
                }
                
                return ts.visitEachChild(node, visitor, context)
            }
            
            return ts.visitNode(sourceFile, visitor) as ts.SourceFile
        }
    }
    
    return { analyzer, transformer }
}

/**
 * Vite plugin for tree shaking analysis
 */
export function viteTreeShakingPlugin(options: {
    entryPoints?: string[]
    generateReport?: boolean
} = {}) {
    const { analyzer, transformer } = createUsageTracker()
    
    // Register entry points
    options.entryPoints?.forEach(entry => analyzer.addEntryPoint(entry))
    
    return {
        name: 'pulsar-tree-shaking',
        
        buildEnd() {
            if (options.generateReport) {
                console.log('\n' + analyzer.generateReport())
            }
        }
    }
}
