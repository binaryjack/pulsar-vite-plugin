/**
 * Dead Code Analyzer
 * Identifies unused variables, functions, and imports
 */

import * as ts from 'typescript';

export interface IDeadCode {
    node: ts.Node;
    name: string;
    type: 'variable' | 'function' | 'import' | 'parameter';
    reason: string;
}

/**
 * Finds all dead code in a source file
 */
export function analyzeDeadCode(
    sourceFile: ts.SourceFile,
    typeChecker: ts.TypeChecker
): IDeadCode[] {
    const deadCode: IDeadCode[] = [];
    const usedIdentifiers = new Set<string>();
    const declaredIdentifiers = new Map<string, { node: ts.Node; type: IDeadCode['type'] }>();

    // First pass: collect all declarations
    function collectDeclarations(node: ts.Node): void {
        // Variable declarations
        if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
            declaredIdentifiers.set(node.name.text, { node, type: 'variable' });
        }

        // Function declarations
        if (ts.isFunctionDeclaration(node) && node.name) {
            declaredIdentifiers.set(node.name.text, { node, type: 'function' });
        }

        // Import declarations
        if (ts.isImportDeclaration(node) && node.importClause) {
            const importClause = node.importClause;
            
            // Named imports
            if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
                for (const element of importClause.namedBindings.elements) {
                    declaredIdentifiers.set(element.name.text, { node: element, type: 'import' });
                }
            }

            // Default import
            if (importClause.name) {
                declaredIdentifiers.set(importClause.name.text, { node: importClause, type: 'import' });
            }
        }

        ts.forEachChild(node, collectDeclarations);
    }

    // Second pass: collect all usages
    function collectUsages(node: ts.Node): void {
        if (ts.isIdentifier(node)) {
            usedIdentifiers.add(node.text);
        }

        ts.forEachChild(node, collectUsages);
    }

    collectDeclarations(sourceFile);
    collectUsages(sourceFile);

    // Find dead code
    for (const [name, { node, type }] of declaredIdentifiers.entries()) {
        if (!usedIdentifiers.has(name)) {
            // Check if it's exported (exported items are not dead)
            if (!isExported(node)) {
                deadCode.push({
                    node,
                    name,
                    type,
                    reason: `Declared but never used`
                });
            }
        }
    }

    return deadCode;
}

/**
 * Checks if a node is exported
 */
function isExported(node: ts.Node): boolean {
    let current: ts.Node | undefined = node;

    while (current) {
        // Check modifiers for export keyword
        if (ts.canHaveModifiers(current)) {
            const modifiers = ts.getModifiers(current);
            if (modifiers) {
                for (const modifier of modifiers) {
                    if (modifier.kind === ts.SyntaxKind.ExportKeyword) {
                        return true;
                    }
                }
            }
        }

        // Check if parent is export declaration
        if (current.parent && ts.isExportDeclaration(current.parent)) {
            return true;
        }

        current = current.parent;
    }

    return false;
}

/**
 * Analyzes unused imports specifically
 */
export function analyzeUnusedImports(
    sourceFile: ts.SourceFile,
    typeChecker: ts.TypeChecker
): IDeadCode[] {
    const deadCode = analyzeDeadCode(sourceFile, typeChecker);
    return deadCode.filter(dc => dc.type === 'import');
}

/**
 * Checks if a function is pure (has no side effects)
 */
export function isPureFunction(node: ts.FunctionDeclaration, typeChecker: ts.TypeChecker): boolean {
    // Simplified purity check
    // A function is pure if it doesn't:
    // - Modify external state
    // - Call impure functions
    // - Access DOM/window
    // - Throw exceptions
    
    let hasSideEffects = false;

    function checkNode(n: ts.Node): void {
        // Check for property assignments (mutations)
        if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
            hasSideEffects = true;
        }

        // Check for function calls (might have side effects)
        if (ts.isCallExpression(n)) {
            // Allow known pure functions (Math.*, Array methods, etc.)
            const expr = n.expression;
            if (ts.isPropertyAccessExpression(expr)) {
                const objName = expr.expression.getText();
                if (!['Math', 'String', 'Number', 'Array'].includes(objName)) {
                    hasSideEffects = true;
                }
            } else {
                hasSideEffects = true;
            }
        }

        // Check for DOM access
        if (ts.isIdentifier(n) && ['document', 'window', 'console'].includes(n.text)) {
            hasSideEffects = true;
        }

        ts.forEachChild(n, checkNode);
    }

    if (node.body) {
        checkNode(node.body);
    }

    return !hasSideEffects;
}
