import * as ts from 'typescript'
import { TransformationContext } from '../context'
import { ElementGenerator } from '../generator/element-generator'
import { IJSXElementIR, IPropIR } from '../ir/types'

describe('ElementGenerator', () => {
    let generator: any
    let mockContext: any

    beforeEach(() => {
        // Create mock transformation context
        const mockProgram = {
            getTypeChecker: () => ({}) 
        } as any as ts.Program
        const mockSourceFile = ts.createSourceFile(
            'test.tsx',
            '',
            ts.ScriptTarget.Latest
        )
        const mockTsContext = {} as ts.TransformationContext

        mockContext = new TransformationContext(
            mockProgram,
            mockSourceFile,
            mockTsContext
        )

        // Create generator
        generator = new ElementGenerator(mockContext)
    })

    describe('generateStaticElement', () => {
        it('should generate code for a simple static div', () => {
            const elementIR: IJSXElementIR = {
                type: 'element',
                tag: 'div',
                props: [
                    {
                        name: 'className',
                        value: ts.factory.createStringLiteral('container'),
                        isStatic: true,
                        isDynamic: false,
                        dependsOn: []
                    }
                ] as IPropIR[],
                children: [],
                isStatic: true,
                hasDynamicChildren: false,
                events: [],
                key: undefined
            }

            const result = generator.generateStaticElement(elementIR)

            expect(result).toBeDefined()
            expect(ts.isCallExpression(result)).toBe(true)
        })

        it('should generate code with text content', () => {
            const elementIR: IJSXElementIR = {
                type: 'element',
                tag: 'h1',
                props: [],
                children: [
                    {
                        type: 'text',
                        content: 'Hello World',
                        isStatic: true
                    }
                ],
                isStatic: true,
                hasDynamicChildren: false,
                events: [],
                key: undefined
            }

            const result = generator.generateStaticElement(elementIR)

            expect(result).toBeDefined()
            expect(ts.isCallExpression(result)).toBe(true)
        })
    })

    describe('generateDynamicElement', () => {
        it('should generate code for element with dynamic property', () => {
            const elementIR: IJSXElementIR = {
                type: 'element',
                tag: 'div',
                props: [
                    {
                        name: 'textContent',
                        value: ts.factory.createCallExpression(
                            ts.factory.createIdentifier('count'),
                            undefined,
                            []
                        ),
                        isStatic: false,
                        isDynamic: true,
                        dependsOn: ['count']
                    }
                ] as IPropIR[],
                children: [],
                isStatic: false,
                hasDynamicChildren: false,
                events: [],
                key: undefined
            }

            const result = generator.generateDynamicElement(elementIR)

            expect(result).toBeDefined()
            expect(ts.isCallExpression(result)).toBe(true)
        })

        it('should generate code for element with event listener', () => {
            const elementIR: IJSXElementIR = {
                type: 'element',
                tag: 'button',
                props: [],
                children: [],
                isStatic: false,
                hasDynamicChildren: false,
                events: [
                    {
                        type: 'click',
                        handler: ts.factory.createIdentifier('handleClick'),
                        modifiers: []
                    }
                ],
                key: undefined
            }

            const result = generator.generateDynamicElement(elementIR)

            expect(result).toBeDefined()
            expect(ts.isCallExpression(result)).toBe(true)
        })
    })

    describe('generateEventListeners', () => {
        it('should generate addEventListener calls', () => {
            const elementIR: IJSXElementIR = {
                type: 'element',
                tag: 'button',
                props: [],
                children: [],
                isStatic: false,
                hasDynamicChildren: false,
                events: [
                    {
                        type: 'click',
                        handler: ts.factory.createIdentifier('handleClick'),
                        modifiers: []
                    }
                ],
                key: undefined
            }

            const statements = generator.generateEventListeners('el0', elementIR)

            expect(statements).toHaveLength(1)
            expect(ts.isExpressionStatement(statements[0])).toBe(true)
        })

        it('should return empty array when no events', () => {
            const elementIR: IJSXElementIR = {
                type: 'element',
                tag: 'div',
                props: [],
                children: [],
                isStatic: true,
                hasDynamicChildren: false,
                events: [],
                key: undefined
            }

            const statements = generator.generateEventListeners('el0', elementIR)

            expect(statements).toHaveLength(0)
        })
    })

    describe('generateChildren', () => {
        it('should generate code for text children', () => {
            const children = [
                {
                    type: 'text',
                    content: 'Hello',
                    isStatic: true
                }
            ]

            const statements = generator.generateChildren(children, 'el0')

            expect(statements.length).toBeGreaterThan(0)
            expect(ts.isExpressionStatement(statements[0])).toBe(true)
        })

        it('should generate code for dynamic expression children', () => {
            const children = [
                {
                    type: 'expression',
                    expression: ts.factory.createCallExpression(
                        ts.factory.createIdentifier('count'),
                        undefined,
                        []
                    ),
                    isStatic: false,
                    dependsOn: ['count']
                }
            ]

            const statements = generator.generateChildren(children, 'el0')

            expect(statements.length).toBeGreaterThan(0)
        })
    })

    describe('generateDynamicProps', () => {
        it('should wrap dynamic properties in createEffect', () => {
            const elementIR: IJSXElementIR = {
                type: 'element',
                tag: 'div',
                props: [
                    {
                        name: 'className',
                        value: ts.factory.createCallExpression(
                            ts.factory.createIdentifier('computeClass'),
                            undefined,
                            []
                        ),
                        isStatic: false,
                        isDynamic: true,
                        dependsOn: []
                    }
                ] as IPropIR[],
                children: [],
                isStatic: false,
                hasDynamicChildren: false,
                events: [],
                key: undefined
            }

            const statements = generator.generateDynamicProps('el0', elementIR)

            expect(statements.length).toBeGreaterThan(0)
            expect(ts.isExpressionStatement(statements[0])).toBe(true)
        })

        it('should ignore event handlers and ref', () => {
            const elementIR: IJSXElementIR = {
                type: 'element',
                tag: 'button',
                props: [
                    {
                        name: 'onClick',
                        value: ts.factory.createIdentifier('handleClick'),
                        isStatic: false,
                        isDynamic: true,
                        dependsOn: []
                    },
                    {
                        name: 'ref',
                        value: ts.factory.createIdentifier('buttonRef'),
                        isStatic: false,
                        isDynamic: true,
                        dependsOn: []
                    }
                ] as IPropIR[],
                children: [],
                isStatic: false,
                hasDynamicChildren: false,
                events: [],
                key: undefined
            }

            const statements = generator.generateDynamicProps('el0', elementIR)

            expect(statements).toHaveLength(0)
        })
    })

    describe('generateRefAssignment', () => {
        it('should generate safe ref assignment', () => {
            const refExpr = ts.factory.createIdentifier('buttonRef')
            const statement = generator.generateRefAssignment('el0', refExpr)

            expect(statement).toBeDefined()
            expect(ts.isIfStatement(statement!)).toBe(true)
        })
    })

    describe('generate', () => {
        it('should choose static generation for static elements', () => {
            const elementIR: IJSXElementIR = {
                type: 'element',
                tag: 'div',
                props: [
                    {
                        name: 'className',
                        value: ts.factory.createStringLiteral('static'),
                        isStatic: true,
                        isDynamic: false,
                        dependsOn: []
                    }
                ] as IPropIR[],
                children: [],
                isStatic: true,
                hasDynamicChildren: false,
                events: [],
                key: undefined
            }

            const spy = jest.spyOn(generator, 'generateStaticElement')
            generator.generate(elementIR)

            expect(spy).toHaveBeenCalled()
        })

        it('should choose dynamic generation for dynamic elements', () => {
            const elementIR: IJSXElementIR = {
                type: 'element',
                tag: 'div',
                props: [
                    {
                        name: 'textContent',
                        value: ts.factory.createCallExpression(
                            ts.factory.createIdentifier('count'),
                            undefined,
                            []
                        ),
                        isStatic: false,
                        isDynamic: true,
                        dependsOn: ['count']
                    }
                ] as IPropIR[],
                children: [],
                isStatic: false,
                hasDynamicChildren: false,
                events: [],
                key: undefined
            }

            const spy = jest.spyOn(generator, 'generateDynamicElement')
            generator.generate(elementIR)

            expect(spy).toHaveBeenCalled()
        })
    })
})
