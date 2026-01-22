import * as ts from 'typescript'
import { IArrayMapPattern } from '../../../parser/jsx-analyzer/prototype/map-pattern-detector'

/**
 * Generates TypeScript code for keyed reconciliation of array.map() calls
 * This creates similar behavior to the <For> component but inline
 */

export interface IKeyedReconciliationOptions {
    mapPattern: IArrayMapPattern
    parentVar: string
    varCounter: number
    elementGenerator: any // IElementGenerator instance
}

/**
 * Generates keyed reconciliation code for an array.map() expression
 * 
 * Generated pattern:
 * (() => {
 *   const container = document.createElement('div')
 *   container.style.display = 'contents'
 *   const state = { items: new Map(), cleanups: new Map() }
 *   
 *   createEffect(() => {
 *     const array = arrayExpression()
 *     const keyFn = (item, index) => keyExpression
 *     
 *     // Track new keys
 *     const newKeys = new Set()
 *     array.forEach((item, index) => {
 *       const key = keyFn(item, index)
 *       newKeys.add(key)
 *     })
 *     
 *     // Remove deleted items
 *     state.items.forEach((element, key) => {
 *       if (!newKeys.has(key)) {
 *         container.removeChild(element)
 *         state.items.delete(key)
 *         const cleanup = state.cleanups.get(key)
 *         if (cleanup) cleanup()
 *         state.cleanups.delete(key)
 *       }
 *     })
 *     
 *     // Add or update items
 *     let position = 0
 *     array.forEach((item, index) => {
 *       const key = keyFn(item, index)
 *       
 *       if (!state.items.has(key)) {
 *         const element = renderFunction(item, index)
 *         if (position >= container.children.length) {
 *           container.appendChild(element)
 *         } else {
 *           container.insertBefore(element, container.children[position])
 *         }
 *         state.items.set(key, element)
 *       } else {
 *         const element = state.items.get(key)
 *         const currentIndex = Array.from(container.children).indexOf(element)
 *         if (currentIndex !== position) {
 *           if (position >= container.children.length) {
 *             container.appendChild(element)
 *           } else {
 *             container.insertBefore(element, container.children[position])
 *           }
 *         }
 *       }
 *       position++
 *     })
 *   })
 *   
 *   return container
 * })()
 */
export function generateKeyedReconciliation(options: IKeyedReconciliationOptions): ts.Expression {
    const { mapPattern, varCounter } = options
    const factory = ts.factory

    if (!mapPattern.isMapCall || !mapPattern.arrayExpression || !mapPattern.mapCallback) {
        throw new Error('Invalid map pattern provided to generateKeyedReconciliation')
    }

    const containerVar = `mapContainer${varCounter}`
    const stateVar = `mapState${varCounter}`
    const statements: ts.Statement[] = []

    // const container = document.createElement('div')
    statements.push(
        factory.createVariableStatement(
            undefined,
            factory.createVariableDeclarationList(
                [
                    factory.createVariableDeclaration(
                        factory.createIdentifier(containerVar),
                        undefined,
                        undefined,
                        factory.createCallExpression(
                            factory.createPropertyAccessExpression(
                                factory.createIdentifier('document'),
                                factory.createIdentifier('createElement')
                            ),
                            undefined,
                            [factory.createStringLiteral('div')]
                        )
                    )
                ],
                ts.NodeFlags.Const
            )
        )
    )

    // container.style.display = 'contents'
    statements.push(
        factory.createExpressionStatement(
            factory.createBinaryExpression(
                factory.createPropertyAccessExpression(
                    factory.createPropertyAccessExpression(
                        factory.createIdentifier(containerVar),
                        factory.createIdentifier('style')
                    ),
                    factory.createIdentifier('display')
                ),
                factory.createToken(ts.SyntaxKind.EqualsToken),
                factory.createStringLiteral('contents')
            )
        )
    )

    // const state = { items: new Map(), cleanups: new Map() }
    statements.push(
        factory.createVariableStatement(
            undefined,
            factory.createVariableDeclarationList(
                [
                    factory.createVariableDeclaration(
                        factory.createIdentifier(stateVar),
                        undefined,
                        undefined,
                        factory.createObjectLiteralExpression([
                            factory.createPropertyAssignment(
                                factory.createIdentifier('items'),
                                factory.createNewExpression(
                                    factory.createIdentifier('Map'),
                                    undefined,
                                    []
                                )
                            ),
                            factory.createPropertyAssignment(
                                factory.createIdentifier('cleanups'),
                                factory.createNewExpression(
                                    factory.createIdentifier('Map'),
                                    undefined,
                                    []
                                )
                            )
                        ])
                    )
                ],
                ts.NodeFlags.Const
            )
        )
    )

    // Build the createEffect callback
    const effectStatements: ts.Statement[] = []

    // const array = arrayExpression()
    effectStatements.push(
        factory.createVariableStatement(
            undefined,
            factory.createVariableDeclarationList(
                [
                    factory.createVariableDeclaration(
                        factory.createIdentifier('array'),
                        undefined,
                        undefined,
                        mapPattern.arrayExpression
                    )
                ],
                ts.NodeFlags.Const
            )
        )
    )

    // Handle empty array case
    effectStatements.push(
        factory.createIfStatement(
            factory.createBinaryExpression(
                factory.createBinaryExpression(
                    factory.createPrefixUnaryExpression(
                        ts.SyntaxKind.ExclamationToken,
                        factory.createIdentifier('array')
                    ),
                    factory.createToken(ts.SyntaxKind.BarBarToken),
                    factory.createBinaryExpression(
                        factory.createPropertyAccessExpression(
                            factory.createIdentifier('array'),
                            factory.createIdentifier('length')
                        ),
                        factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
                        factory.createNumericLiteral('0')
                    )
                ),
                factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
                factory.createBinaryExpression(
                    factory.createPropertyAccessExpression(
                        factory.createPropertyAccessExpression(
                            factory.createIdentifier(stateVar),
                            factory.createIdentifier('items')
                        ),
                        factory.createIdentifier('size')
                    ),
                    factory.createToken(ts.SyntaxKind.GreaterThanToken),
                    factory.createNumericLiteral('0')
                )
            ),
            factory.createBlock([
                // Clear all items
                factory.createExpressionStatement(
                    factory.createCallExpression(
                        factory.createPropertyAccessExpression(
                            factory.createPropertyAccessExpression(
                                factory.createIdentifier(stateVar),
                                factory.createIdentifier('items')
                            ),
                            factory.createIdentifier('forEach')
                        ),
                        undefined,
                        [
                            factory.createArrowFunction(
                                undefined,
                                undefined,
                                [
                                    factory.createParameterDeclaration(undefined, undefined, 'element'),
                                    factory.createParameterDeclaration(undefined, undefined, 'key')
                                ],
                                undefined,
                                factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                                factory.createBlock([
                                    factory.createExpressionStatement(
                                        factory.createCallExpression(
                                            factory.createPropertyAccessExpression(
                                                factory.createIdentifier(containerVar),
                                                factory.createIdentifier('removeChild')
                                            ),
                                            undefined,
                                            [factory.createIdentifier('element')]
                                        )
                                    )
                                ], true)
                            )
                        ]
                    )
                ),
                factory.createExpressionStatement(
                    factory.createCallExpression(
                        factory.createPropertyAccessExpression(
                            factory.createPropertyAccessExpression(
                                factory.createIdentifier(stateVar),
                                factory.createIdentifier('items')
                            ),
                            factory.createIdentifier('clear')
                        ),
                        undefined,
                        []
                    )
                ),
                factory.createReturnStatement()
            ], true)
        )
    )

    // Generate key function or use index
    let keyFunction: ts.Expression
    
    if (mapPattern.keyExpression) {
        // User provided a key prop
        const itemParam = mapPattern.itemParam?.name || factory.createIdentifier('item')
        const indexParam = mapPattern.indexParam?.name || factory.createIdentifier('index')
        
        keyFunction = factory.createArrowFunction(
            undefined,
            undefined,
            [
                factory.createParameterDeclaration(undefined, undefined, itemParam),
                factory.createParameterDeclaration(undefined, undefined, indexParam)
            ],
            undefined,
            factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            mapPattern.keyExpression
        )
    } else {
        // No key, use index
        keyFunction = factory.createArrowFunction(
            undefined,
            undefined,
            [
                factory.createParameterDeclaration(undefined, undefined, 'item'),
                factory.createParameterDeclaration(undefined, undefined, 'index')
            ],
            undefined,
            factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            factory.createIdentifier('index')
        )
    }

    // const keyFn = ...
    effectStatements.push(
        factory.createVariableStatement(
            undefined,
            factory.createVariableDeclarationList(
                [
                    factory.createVariableDeclaration(
                        factory.createIdentifier('keyFn'),
                        undefined,
                        undefined,
                        keyFunction
                    )
                ],
                ts.NodeFlags.Const
            )
        )
    )

    // const newKeys = new Set()
    effectStatements.push(
        factory.createVariableStatement(
            undefined,
            factory.createVariableDeclarationList(
                [
                    factory.createVariableDeclaration(
                        factory.createIdentifier('newKeys'),
                        undefined,
                        undefined,
                        factory.createNewExpression(
                            factory.createIdentifier('Set'),
                            undefined,
                            []
                        )
                    )
                ],
                ts.NodeFlags.Const
            )
        )
    )

    // array.forEach((item, index) => newKeys.add(keyFn(item, index)))
    effectStatements.push(
        factory.createExpressionStatement(
            factory.createCallExpression(
                factory.createPropertyAccessExpression(
                    factory.createIdentifier('array'),
                    factory.createIdentifier('forEach')
                ),
                undefined,
                [
                    factory.createArrowFunction(
                        undefined,
                        undefined,
                        [
                            factory.createParameterDeclaration(undefined, undefined, 'item'),
                            factory.createParameterDeclaration(undefined, undefined, 'index')
                        ],
                        undefined,
                        factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                        factory.createCallExpression(
                            factory.createPropertyAccessExpression(
                                factory.createIdentifier('newKeys'),
                                factory.createIdentifier('add')
                            ),
                            undefined,
                            [
                                factory.createCallExpression(
                                    factory.createIdentifier('keyFn'),
                                    undefined,
                                    [factory.createIdentifier('item'), factory.createIdentifier('index')]
                                )
                            ]
                        )
                    )
                ]
            )
        )
    )

    // Remove deleted items: state.items.forEach((element, key) => { if (!newKeys.has(key)) ... })
    effectStatements.push(
        factory.createExpressionStatement(
            factory.createCallExpression(
                factory.createPropertyAccessExpression(
                    factory.createPropertyAccessExpression(
                        factory.createIdentifier(stateVar),
                        factory.createIdentifier('items')
                    ),
                    factory.createIdentifier('forEach')
                ),
                undefined,
                [
                    factory.createArrowFunction(
                        undefined,
                        undefined,
                        [
                            factory.createParameterDeclaration(undefined, undefined, 'element'),
                            factory.createParameterDeclaration(undefined, undefined, 'key')
                        ],
                        undefined,
                        factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                        factory.createBlock([
                            factory.createIfStatement(
                                factory.createPrefixUnaryExpression(
                                    ts.SyntaxKind.ExclamationToken,
                                    factory.createCallExpression(
                                        factory.createPropertyAccessExpression(
                                            factory.createIdentifier('newKeys'),
                                            factory.createIdentifier('has')
                                        ),
                                        undefined,
                                        [factory.createIdentifier('key')]
                                    )
                                ),
                                factory.createBlock([
                                    // container.removeChild(element)
                                    factory.createExpressionStatement(
                                        factory.createCallExpression(
                                            factory.createPropertyAccessExpression(
                                                factory.createIdentifier(containerVar),
                                                factory.createIdentifier('removeChild')
                                            ),
                                            undefined,
                                            [factory.createIdentifier('element')]
                                        )
                                    ),
                                    // state.items.delete(key)
                                    factory.createExpressionStatement(
                                        factory.createCallExpression(
                                            factory.createPropertyAccessExpression(
                                                factory.createPropertyAccessExpression(
                                                    factory.createIdentifier(stateVar),
                                                    factory.createIdentifier('items')
                                                ),
                                                factory.createIdentifier('delete')
                                            ),
                                            undefined,
                                            [factory.createIdentifier('key')]
                                        )
                                    ),
                                    // cleanup
                                    factory.createVariableStatement(
                                        undefined,
                                        factory.createVariableDeclarationList(
                                            [
                                                factory.createVariableDeclaration(
                                                    'cleanup',
                                                    undefined,
                                                    undefined,
                                                    factory.createCallExpression(
                                                        factory.createPropertyAccessExpression(
                                                            factory.createPropertyAccessExpression(
                                                                factory.createIdentifier(stateVar),
                                                                factory.createIdentifier('cleanups')
                                                            ),
                                                            factory.createIdentifier('get')
                                                        ),
                                                        undefined,
                                                        [factory.createIdentifier('key')]
                                                    )
                                                )
                                            ],
                                            ts.NodeFlags.Const
                                        )
                                    ),
                                    factory.createIfStatement(
                                        factory.createIdentifier('cleanup'),
                                        factory.createExpressionStatement(
                                            factory.createCallExpression(
                                                factory.createIdentifier('cleanup'),
                                                undefined,
                                                []
                                            )
                                        )
                                    ),
                                    factory.createExpressionStatement(
                                        factory.createCallExpression(
                                            factory.createPropertyAccessExpression(
                                                factory.createPropertyAccessExpression(
                                                    factory.createIdentifier(stateVar),
                                                    factory.createIdentifier('cleanups')
                                                ),
                                                factory.createIdentifier('delete')
                                            ),
                                            undefined,
                                            [factory.createIdentifier('key')]
                                        )
                                    )
                                ], true)
                            )
                        ], true)
                    )
                ]
            )
        )
    )

    // let position = 0
    effectStatements.push(
        factory.createVariableStatement(
            undefined,
            factory.createVariableDeclarationList(
                [
                    factory.createVariableDeclaration(
                        'position',
                        undefined,
                        undefined,
                        factory.createNumericLiteral('0')
                    )
                ],
                ts.NodeFlags.Let
            )
        )
    )

    // Build the render function from the map callback
    // We need to transform the JSX in the callback body
    const renderFunction = mapPattern.mapCallback

    // array.forEach((item, index) => { ... add or update logic ... })
    effectStatements.push(
        factory.createExpressionStatement(
            factory.createCallExpression(
                factory.createPropertyAccessExpression(
                    factory.createIdentifier('array'),
                    factory.createIdentifier('forEach')
                ),
                undefined,
                [
                    factory.createArrowFunction(
                        undefined,
                        undefined,
                        [
                            factory.createParameterDeclaration(undefined, undefined, 'item'),
                            factory.createParameterDeclaration(undefined, undefined, 'index')
                        ],
                        undefined,
                        factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                        factory.createBlock([
                            // const key = keyFn(item, index)
                            factory.createVariableStatement(
                                undefined,
                                factory.createVariableDeclarationList(
                                    [
                                        factory.createVariableDeclaration(
                                            'key',
                                            undefined,
                                            undefined,
                                            factory.createCallExpression(
                                                factory.createIdentifier('keyFn'),
                                                undefined,
                                                [factory.createIdentifier('item'), factory.createIdentifier('index')]
                                            )
                                        )
                                    ],
                                    ts.NodeFlags.Const
                                )
                            ),
                            // if (!state.items.has(key)) { create new } else { reposition }
                            factory.createIfStatement(
                                factory.createPrefixUnaryExpression(
                                    ts.SyntaxKind.ExclamationToken,
                                    factory.createCallExpression(
                                        factory.createPropertyAccessExpression(
                                            factory.createPropertyAccessExpression(
                                                factory.createIdentifier(stateVar),
                                                factory.createIdentifier('items')
                                            ),
                                            factory.createIdentifier('has')
                                        ),
                                        undefined,
                                        [factory.createIdentifier('key')]
                                    )
                                ),
                                // Create new element
                                factory.createBlock([
                                    // const element = renderFn(item, index)
                                    factory.createVariableStatement(
                                        undefined,
                                        factory.createVariableDeclarationList(
                                            [
                                                factory.createVariableDeclaration(
                                                    'element',
                                                    undefined,
                                                    undefined,
                                                    factory.createCallExpression(
                                                        renderFunction,
                                                        undefined,
                                                        [factory.createIdentifier('item'), factory.createIdentifier('index')]
                                                    )
                                                )
                                            ],
                                            ts.NodeFlags.Const
                                        )
                                    ),
                                    // Insert at position
                                    factory.createIfStatement(
                                        factory.createBinaryExpression(
                                            factory.createIdentifier('position'),
                                            factory.createToken(ts.SyntaxKind.GreaterThanEqualsToken),
                                            factory.createPropertyAccessExpression(
                                                factory.createPropertyAccessExpression(
                                                    factory.createIdentifier(containerVar),
                                                    factory.createIdentifier('children')
                                                ),
                                                factory.createIdentifier('length')
                                            )
                                        ),
                                        factory.createBlock([
                                            factory.createExpressionStatement(
                                                factory.createCallExpression(
                                                    factory.createPropertyAccessExpression(
                                                        factory.createIdentifier(containerVar),
                                                        factory.createIdentifier('appendChild')
                                                    ),
                                                    undefined,
                                                    [factory.createIdentifier('element')]
                                                )
                                            )
                                        ], true),
                                        factory.createBlock([
                                            factory.createExpressionStatement(
                                                factory.createCallExpression(
                                                    factory.createPropertyAccessExpression(
                                                        factory.createIdentifier(containerVar),
                                                        factory.createIdentifier('insertBefore')
                                                    ),
                                                    undefined,
                                                    [
                                                        factory.createIdentifier('element'),
                                                        factory.createElementAccessExpression(
                                                            factory.createPropertyAccessExpression(
                                                                factory.createIdentifier(containerVar),
                                                                factory.createIdentifier('children')
                                                            ),
                                                            factory.createIdentifier('position')
                                                        )
                                                    ]
                                                )
                                            )
                                        ], true)
                                    ),
                                    // state.items.set(key, element)
                                    factory.createExpressionStatement(
                                        factory.createCallExpression(
                                            factory.createPropertyAccessExpression(
                                                factory.createPropertyAccessExpression(
                                                    factory.createIdentifier(stateVar),
                                                    factory.createIdentifier('items')
                                                ),
                                                factory.createIdentifier('set')
                                            ),
                                            undefined,
                                            [factory.createIdentifier('key'), factory.createIdentifier('element')]
                                        )
                                    )
                                ], true),
                                // Element exists, ensure position
                                factory.createBlock([
                                    factory.createVariableStatement(
                                        undefined,
                                        factory.createVariableDeclarationList(
                                            [
                                                factory.createVariableDeclaration(
                                                    'element',
                                                    undefined,
                                                    undefined,
                                                    factory.createNonNullExpression(
                                                        factory.createCallExpression(
                                                            factory.createPropertyAccessExpression(
                                                                factory.createPropertyAccessExpression(
                                                                    factory.createIdentifier(stateVar),
                                                                    factory.createIdentifier('items')
                                                                ),
                                                                factory.createIdentifier('get')
                                                            ),
                                                            undefined,
                                                            [factory.createIdentifier('key')]
                                                        )
                                                    )
                                                )
                                            ],
                                            ts.NodeFlags.Const
                                        )
                                    ),
                                    factory.createVariableStatement(
                                        undefined,
                                        factory.createVariableDeclarationList(
                                            [
                                                factory.createVariableDeclaration(
                                                    'currentIndex',
                                                    undefined,
                                                    undefined,
                                                    factory.createCallExpression(
                                                        factory.createPropertyAccessExpression(
                                                            factory.createCallExpression(
                                                                factory.createPropertyAccessExpression(
                                                                    factory.createIdentifier('Array'),
                                                                    factory.createIdentifier('from')
                                                                ),
                                                                undefined,
                                                                [
                                                                    factory.createPropertyAccessExpression(
                                                                        factory.createIdentifier(containerVar),
                                                                        factory.createIdentifier('children')
                                                                    )
                                                                ]
                                                            ),
                                                            factory.createIdentifier('indexOf')
                                                        ),
                                                        undefined,
                                                        [factory.createIdentifier('element')]
                                                    )
                                                )
                                            ],
                                            ts.NodeFlags.Const
                                        )
                                    ),
                                    factory.createIfStatement(
                                        factory.createBinaryExpression(
                                            factory.createIdentifier('currentIndex'),
                                            factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
                                            factory.createIdentifier('position')
                                        ),
                                        factory.createBlock([
                                            factory.createIfStatement(
                                                factory.createBinaryExpression(
                                                    factory.createIdentifier('position'),
                                                    factory.createToken(ts.SyntaxKind.GreaterThanEqualsToken),
                                                    factory.createPropertyAccessExpression(
                                                        factory.createPropertyAccessExpression(
                                                            factory.createIdentifier(containerVar),
                                                            factory.createIdentifier('children')
                                                        ),
                                                        factory.createIdentifier('length')
                                                    )
                                                ),
                                                factory.createBlock([
                                                    factory.createExpressionStatement(
                                                        factory.createCallExpression(
                                                            factory.createPropertyAccessExpression(
                                                                factory.createIdentifier(containerVar),
                                                                factory.createIdentifier('appendChild')
                                                            ),
                                                            undefined,
                                                            [factory.createIdentifier('element')]
                                                        )
                                                    )
                                                ], true),
                                                factory.createBlock([
                                                    factory.createVariableStatement(
                                                        undefined,
                                                        factory.createVariableDeclarationList(
                                                            [
                                                                factory.createVariableDeclaration(
                                                                    'referenceNode',
                                                                    undefined,
                                                                    undefined,
                                                                    factory.createElementAccessExpression(
                                                                        factory.createPropertyAccessExpression(
                                                                            factory.createIdentifier(containerVar),
                                                                            factory.createIdentifier('children')
                                                                        ),
                                                                        factory.createIdentifier('position')
                                                                    )
                                                                )
                                                            ],
                                                            ts.NodeFlags.Const
                                                        )
                                                    ),
                                                    factory.createIfStatement(
                                                        factory.createBinaryExpression(
                                                            factory.createIdentifier('referenceNode'),
                                                            factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
                                                            factory.createIdentifier('element')
                                                        ),
                                                        factory.createBlock([
                                                            factory.createExpressionStatement(
                                                                factory.createCallExpression(
                                                                    factory.createPropertyAccessExpression(
                                                                        factory.createIdentifier(containerVar),
                                                                        factory.createIdentifier('insertBefore')
                                                                    ),
                                                                    undefined,
                                                                    [factory.createIdentifier('element'), factory.createIdentifier('referenceNode')]
                                                                )
                                                            )
                                                        ], true)
                                                    )
                                                ], true)
                                            )
                                        ], true)
                                    )
                                ], true)
                            ),
                            // position++
                            factory.createExpressionStatement(
                                factory.createPostfixUnaryExpression(
                                    factory.createIdentifier('position'),
                                    ts.SyntaxKind.PlusPlusToken
                                )
                            )
                        ], true)
                    )
                ]
            )
        )
    )

    // createEffect(() => { ...all the effect statements... })
    statements.push(
        factory.createExpressionStatement(
            factory.createCallExpression(
                factory.createIdentifier('createEffect'),
                undefined,
                [
                    factory.createArrowFunction(
                        undefined,
                        undefined,
                        [],
                        undefined,
                        factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                        factory.createBlock(effectStatements, true)
                    )
                ]
            )
        )
    )

    // return container
    statements.push(
        factory.createReturnStatement(
            factory.createIdentifier(containerVar)
        )
    )

    // Wrap in IIFE and return
    return factory.createCallExpression(
        factory.createParenthesizedExpression(
            factory.createArrowFunction(
                undefined,
                undefined,
                [],
                undefined,
                factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                factory.createBlock(statements, true)
            )
        ),
        undefined,
        []
    )
}
