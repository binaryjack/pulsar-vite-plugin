/**
 * Dead Code Eliminator
 * Removes unused code from the AST
 */

import * as ts from 'typescript';
import { analyzeDeadCode, type IDeadCode } from '../analyzers/dead-code-analyzer';

export interface IEliminationResult {
    removedCount: number;
    bytesRemoved: number;
    removedItems: Array<{ name: string; type: IDeadCode['type'] }>;
}

/**
 * Eliminates dead code from a source file
 */
export function eliminateDeadCode(
    sourceFile: ts.SourceFile,
    typeChecker: ts.TypeChecker,
    context: ts.TransformationContext
): { sourceFile: ts.SourceFile; result: IEliminationResult } {
    const deadCode = analyzeDeadCode(sourceFile, typeChecker);
    const nodesToRemove = new Set(deadCode.map(dc => dc.node));
    
    let removedCount = 0;
    let bytesRemoved = 0;
    const removedItems: IEliminationResult['removedItems'] = [];

    function visitor(node: ts.Node): ts.Node | undefined {
        // Remove variable declarations
        if (ts.isVariableDeclaration(node) && nodesToRemove.has(node)) {
            const nodeText = node.getText(sourceFile);
            bytesRemoved += nodeText.length;
            removedCount++;
            
            if (node.name && ts.isIdentifier(node.name)) {
                removedItems.push({ name: node.name.text, type: 'variable' });
            }
            
            return undefined;
        }

        // Remove function declarations
        if (ts.isFunctionDeclaration(node) && nodesToRemove.has(node)) {
            const nodeText = node.getText(sourceFile);
            bytesRemoved += nodeText.length;
            removedCount++;
            
            if (node.name) {
                removedItems.push({ name: node.name.text, type: 'function' });
            }
            
            return undefined;
        }

        // Remove import specifiers
        if (ts.isImportSpecifier(node) && nodesToRemove.has(node)) {
            const nodeText = node.getText(sourceFile);
            bytesRemoved += nodeText.length;
            removedCount++;
            removedItems.push({ name: node.name.text, type: 'import' });
            
            return undefined;
        }

        // Handle named imports - remove entire import if all specifiers removed
        if (ts.isImportDeclaration(node) && node.importClause?.namedBindings) {
            const namedBindings = node.importClause.namedBindings;
            
            if (ts.isNamedImports(namedBindings)) {
                const remainingElements = namedBindings.elements.filter(
                    element => !nodesToRemove.has(element)
                );

                if (remainingElements.length === 0) {
                    // Remove entire import
                    const nodeText = node.getText(sourceFile);
                    bytesRemoved += nodeText.length;
                    return undefined;
                } else if (remainingElements.length < namedBindings.elements.length) {
                    // Recreate import with remaining elements
                    return context.factory.updateImportDeclaration(
                        node,
                        node.modifiers,
                        context.factory.updateImportClause(
                            node.importClause,
                            node.importClause.isTypeOnly,
                            node.importClause.name,
                            context.factory.updateNamedImports(
                                namedBindings,
                                remainingElements
                            )
                        ),
                        node.moduleSpecifier,
                        node.attributes
                    );
                }
            }
        }

        // Handle variable statement - remove if all declarations removed
        if (ts.isVariableStatement(node)) {
            const remainingDeclarations = node.declarationList.declarations.filter(
                decl => !nodesToRemove.has(decl)
            );

            if (remainingDeclarations.length === 0) {
                return undefined;
            } else if (remainingDeclarations.length < node.declarationList.declarations.length) {
                return context.factory.updateVariableStatement(
                    node,
                    node.modifiers,
                    context.factory.updateVariableDeclarationList(
                        node.declarationList,
                        remainingDeclarations
                    )
                );
            }
        }

        return ts.visitEachChild(node, visitor, context);
    }

    const newSourceFile = ts.visitNode(sourceFile, visitor) as ts.SourceFile;

    return {
        sourceFile: newSourceFile,
        result: {
            removedCount,
            bytesRemoved,
            removedItems
        }
    };
}

/**
 * Eliminates only unused imports
 */
export function eliminateUnusedImports(
    sourceFile: ts.SourceFile,
    typeChecker: ts.TypeChecker,
    context: ts.TransformationContext
): { sourceFile: ts.SourceFile; result: IEliminationResult } {
    // Use analyzeDeadCode but only process imports
    const result = eliminateDeadCode(sourceFile, typeChecker, context);
    
    // Filter to only count imports
    const importRemovals = result.result.removedItems.filter(item => item.type === 'import');
    
    return {
        sourceFile: result.sourceFile,
        result: {
            removedCount: importRemovals.length,
            bytesRemoved: result.result.bytesRemoved,
            removedItems: importRemovals
        }
    };
}
