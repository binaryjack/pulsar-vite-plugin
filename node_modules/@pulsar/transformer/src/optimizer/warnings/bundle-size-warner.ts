/**
 * Bundle Size Warner
 * Warns about large imports and bundle size issues
 */

import * as ts from 'typescript';

export interface ISizeWarning {
    type: 'large-import' | 'deep-import' | 'duplicate-dependency';
    message: string;
    node: ts.Node;
    moduleName: string;
    estimatedSize?: number;
    suggestion?: string;
}

const LARGE_LIBRARY_SIZES: Record<string, number> = {
    'lodash': 70000,
    'moment': 230000,
    'rxjs': 150000,
    'date-fns': 15000,
    'axios': 13000,
    'react': 6500,
    'vue': 33000,
    'angular': 140000,
    'three': 580000,
    'd3': 240000,
    'chart.js': 180000,
    'jquery': 87000
};

/**
 * Analyzes imports and generates warnings for bundle size issues
 */
export function analyzeImportSize(
    sourceFile: ts.SourceFile,
    sizeThreshold: number = 100000 // 100KB default
): ISizeWarning[] {
    const warnings: ISizeWarning[] = [];
    const importedModules = new Map<string, ts.ImportDeclaration[]>();

    function visitor(node: ts.Node): void {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
            const moduleName = node.moduleSpecifier.text;
            const baseModule = getBaseModuleName(moduleName);

            // Track imports for duplicate detection
            if (!importedModules.has(baseModule)) {
                importedModules.set(baseModule, []);
            }
            importedModules.get(baseModule)!.push(node);

            // Check for large imports
            const estimatedSize = LARGE_LIBRARY_SIZES[baseModule];
            if (estimatedSize && estimatedSize > sizeThreshold) {
                warnings.push({
                    type: 'large-import',
                    message: `Import '${moduleName}' is large (~${formatBytes(estimatedSize)})`,
                    node,
                    moduleName,
                    estimatedSize,
                    suggestion: getSuggestion(baseModule)
                });
            }

            // Check for deep imports (indicates whole package import)
            if (!moduleName.includes('/') && estimatedSize) {
                const hasNamedImports = node.importClause?.namedBindings 
                    && ts.isNamedImports(node.importClause.namedBindings);
                
                if (!hasNamedImports) {
                    warnings.push({
                        type: 'deep-import',
                        message: `Consider importing specific modules from '${moduleName}' to reduce bundle size`,
                        node,
                        moduleName,
                        suggestion: `Import only what you need: import { specific } from '${moduleName}'`
                    });
                }
            }
        }

        ts.forEachChild(node, visitor);
    }

    visitor(sourceFile);

    // Check for duplicate imports
    for (const [moduleName, imports] of importedModules.entries()) {
        if (imports.length > 1) {
            const locations = imports.map(imp => {
                const pos = sourceFile.getLineAndCharacterOfPosition(imp.getStart());
                return `line ${pos.line + 1}`;
            }).join(', ');

            warnings.push({
                type: 'duplicate-dependency',
                message: `Module '${moduleName}' is imported ${imports.length} times (${locations})`,
                node: imports[0],
                moduleName,
                suggestion: `Consolidate imports into a single import statement`
            });
        }
    }

    return warnings;
}

/**
 * Gets the base module name from a path
 */
function getBaseModuleName(modulePath: string): string {
    // Handle scoped packages (@org/package)
    if (modulePath.startsWith('@')) {
        const parts = modulePath.split('/');
        return parts.slice(0, 2).join('/');
    }

    // Handle regular packages
    return modulePath.split('/')[0];
}

/**
 * Formats bytes to human-readable format
 */
function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Gets optimization suggestions for known libraries
 */
function getSuggestion(moduleName: string): string {
    const suggestions: Record<string, string> = {
        'lodash': 'Use lodash-es for tree-shaking or import specific functions: import debounce from "lodash/debounce"',
        'moment': 'Consider using date-fns or day.js as lighter alternatives',
        'rxjs': 'Import specific operators: import { map, filter } from "rxjs/operators"',
        'three': 'Import only needed modules: import { Scene, Camera } from "three"',
        'd3': 'Import specific modules: import { select } from "d3-selection"',
        'jquery': 'Consider using native DOM APIs or a lighter alternative'
    };

    return suggestions[moduleName] || `Consider importing only the parts you need from ${moduleName}`;
}

/**
 * Estimates bundle size from source file
 */
export function estimateBundleSize(sourceFile: ts.SourceFile): number {
    let size = 0;
    
    function visitor(node: ts.Node): void {
        // Count actual code (excluding comments and whitespace)
        if (ts.isStatement(node) || ts.isExpression(node)) {
            size += node.getText(sourceFile).length;
        }
        
        ts.forEachChild(node, visitor);
    }
    
    visitor(sourceFile);
    return size;
}

/**
 * Generates a bundle size report
 */
export interface IBundleSizeReport {
    totalSize: number;
    codeSize: number;
    importSize: number;
    warnings: ISizeWarning[];
    largestImports: Array<{ name: string; size: number }>;
}

export function generateBundleSizeReport(
    sourceFile: ts.SourceFile,
    sizeThreshold: number = 100000
): IBundleSizeReport {
    const warnings = analyzeImportSize(sourceFile, sizeThreshold);
    const codeSize = estimateBundleSize(sourceFile);
    
    const importSizes = warnings
        .filter(w => w.estimatedSize)
        .map(w => ({ name: w.moduleName, size: w.estimatedSize! }));
    
    const importSize = importSizes.reduce((sum, item) => sum + item.size, 0);
    
    return {
        totalSize: codeSize + importSize,
        codeSize,
        importSize,
        warnings,
        largestImports: importSizes
            .sort((a, b) => b.size - a.size)
            .slice(0, 5)
    };
}
