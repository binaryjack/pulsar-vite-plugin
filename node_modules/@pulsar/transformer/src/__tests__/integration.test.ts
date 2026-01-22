/**
 * Integration tests for the complete transformation pipeline
 * Tests JSXAnalyzer → ElementGenerator → Generated Code
 */

import * as ts from 'typescript'
import { TransformationContext } from '../context'
import { ElementGenerator } from '../generator/element-generator'
import { JSXAnalyzer } from '../parser/jsx-analyzer'

describe('Transformer Integration', () => {
    let analyzer: any
    let generator: any
    let context: any

    beforeEach(() => {
        // Create minimal TypeScript program
        const sourceCode = `
            const Component = () => {
                return <div className="test">Hello</div>
            }
        `

        const sourceFile = ts.createSourceFile(
            'test.tsx',
            sourceCode,
            ts.ScriptTarget.Latest,
            true,
            ts.ScriptKind.TSX
        )

        const compilerOptions: ts.CompilerOptions = {
            jsx: ts.JsxEmit.React,
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.ESNext
        }

        const host = ts.createCompilerHost(compilerOptions)
        const program = {
            getTypeChecker: () => ({})
        } as any as ts.Program
        const tsContext = {} as ts.TransformationContext

        context = new TransformationContext(program, sourceFile, tsContext)
        analyzer = new JSXAnalyzer(context)
        generator = new ElementGenerator(context)
    })

    describe('Static Element Pipeline', () => {
        it('should transform simple div element', () => {
            // Create JSX node: <div className="test">Hello</div>
            const jsxElement = ts.factory.createJsxElement(
                ts.factory.createJsxOpeningElement(
                    ts.factory.createIdentifier('div'),
                    undefined,
                    ts.factory.createJsxAttributes([
                        ts.factory.createJsxAttribute(
                            ts.factory.createIdentifier('className'),
                            ts.factory.createStringLiteral('test')
                        )
                    ])
                ),
                [ts.factory.createJsxText('Hello', false)],
                ts.factory.createJsxClosingElement(
                    ts.factory.createIdentifier('div')
                )
            )

            // Analyze JSX
            const ir = analyzer.analyze(jsxElement)

            expect(ir).toBeDefined()
            expect(ir.tag).toBe('div')
            expect(ir.isStatic).toBe(true)

            // Generate code
            const code = generator.generate(ir)

            expect(code).toBeDefined()
            expect(ts.isCallExpression(code)).toBe(true)
        })
    })

    describe('Dynamic Element Pipeline', () => {
        it('should transform element with signal dependency', () => {
            // Create: <div>{count()}</div>
            const countCall = ts.factory.createCallExpression(
                ts.factory.createIdentifier('count'),
                undefined,
                []
            )

            const jsxElement = ts.factory.createJsxElement(
                ts.factory.createJsxOpeningElement(
                    ts.factory.createIdentifier('div'),
                    undefined,
                    ts.factory.createJsxAttributes([])
                ),
                [
                    ts.factory.createJsxExpression(undefined, countCall)
                ],
                ts.factory.createJsxClosingElement(
                    ts.factory.createIdentifier('div')
                )
            )

            // Analyze
            const ir = analyzer.analyze(jsxElement)

            expect(ir).toBeDefined()
            expect(ir.hasDynamicChildren).toBe(true)

            // Generate
            const code = generator.generate(ir)

            expect(code).toBeDefined()
            expect(ts.isCallExpression(code)).toBe(true)
        })
    })

    describe('Event Handler Pipeline', () => {
        it('should transform button with onClick', () => {
            // Create: <button onClick={handleClick}>Click</button>
            const jsxElement = ts.factory.createJsxElement(
                ts.factory.createJsxOpeningElement(
                    ts.factory.createIdentifier('button'),
                    undefined,
                    ts.factory.createJsxAttributes([
                        ts.factory.createJsxAttribute(
                            ts.factory.createIdentifier('onClick'),
                            ts.factory.createJsxExpression(
                                undefined,
                                ts.factory.createIdentifier('handleClick')
                            )
                        )
                    ])
                ),
                [ts.factory.createJsxText('Click', false)],
                ts.factory.createJsxClosingElement(
                    ts.factory.createIdentifier('button')
                )
            )

            // Analyze
            const ir = analyzer.analyze(jsxElement)

            expect(ir.events).toBeDefined()
            expect(ir.events.length).toBeGreaterThan(0)
            expect(ir.events[0].type).toBe('click')

            // Generate
            const code = generator.generate(ir)

            expect(code).toBeDefined()
        })
    })

    describe('Nested Elements Pipeline', () => {
        it('should transform nested structure', () => {
            // Create: <div><span>Hello</span></div>
            const spanElement = ts.factory.createJsxElement(
                ts.factory.createJsxOpeningElement(
                    ts.factory.createIdentifier('span'),
                    undefined,
                    ts.factory.createJsxAttributes([])
                ),
                [ts.factory.createJsxText('Hello', false)],
                ts.factory.createJsxClosingElement(
                    ts.factory.createIdentifier('span')
                )
            )

            const divElement = ts.factory.createJsxElement(
                ts.factory.createJsxOpeningElement(
                    ts.factory.createIdentifier('div'),
                    undefined,
                    ts.factory.createJsxAttributes([])
                ),
                [spanElement],
                ts.factory.createJsxClosingElement(
                    ts.factory.createIdentifier('div')
                )
            )

            // Analyze
            const ir = analyzer.analyze(divElement)

            expect(ir.children).toBeDefined()
            expect(ir.children.length).toBeGreaterThan(0)

            // Generate
            const code = generator.generate(ir)

            expect(code).toBeDefined()
        })
    })

    describe('Ref Assignment Pipeline', () => {
        it('should transform element with ref', () => {
            // Create: <input ref={inputRef} />
            const jsxElement = ts.factory.createJsxSelfClosingElement(
                ts.factory.createIdentifier('input'),
                undefined,
                ts.factory.createJsxAttributes([
                    ts.factory.createJsxAttribute(
                        ts.factory.createIdentifier('ref'),
                        ts.factory.createJsxExpression(
                            undefined,
                            ts.factory.createIdentifier('inputRef')
                        )
                    )
                ])
            )

            // Analyze
            const ir = analyzer.analyze(jsxElement)

            const refProp = ir.props.find((p: any) => p.name === 'ref')
            expect(refProp).toBeDefined()

            // Generate
            const code = generator.generate(ir)

            expect(code).toBeDefined()
        })
    })

    describe('Mixed Content Pipeline', () => {
        it('should transform element with static and dynamic props', () => {
            // Create: <div className="static" id={computedId()}>Text</div>
            const jsxElement = ts.factory.createJsxElement(
                ts.factory.createJsxOpeningElement(
                    ts.factory.createIdentifier('div'),
                    undefined,
                    ts.factory.createJsxAttributes([
                        ts.factory.createJsxAttribute(
                            ts.factory.createIdentifier('className'),
                            ts.factory.createStringLiteral('static')
                        ),
                        ts.factory.createJsxAttribute(
                            ts.factory.createIdentifier('id'),
                            ts.factory.createJsxExpression(
                                undefined,
                                ts.factory.createCallExpression(
                                    ts.factory.createIdentifier('computedId'),
                                    undefined,
                                    []
                                )
                            )
                        )
                    ])
                ),
                [ts.factory.createJsxText('Text', false)],
                ts.factory.createJsxClosingElement(
                    ts.factory.createIdentifier('div')
                )
            )

            // Analyze
            const ir = analyzer.analyze(jsxElement)

            const staticProp = ir.props.find((p: any) => p.name === 'className')
            const dynamicProp = ir.props.find((p: any) => p.name === 'id')

            expect(staticProp?.isStatic).toBe(true)
            expect(dynamicProp?.isDynamic).toBe(true)

            // Generate
            const code = generator.generate(ir)

            expect(code).toBeDefined()
        })
    })
})
