/**
 * Comprehensive test suite for JSX transformer visitor
 * Tests all contexts where JSX can appear
 */

import * as ts from 'typescript'
import visualSchemaTransformer from '../index'

/**
 * Helper to transform code and check if it contains JSX syntax
 */
function transformCode(code: string): { output: string; hasJSX: boolean } {
    const sourceFile = ts.createSourceFile(
        'test.tsx',
        code,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.TSX
    )

    const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.Preserve,
    }

    const host = ts.createCompilerHost(compilerOptions)
    const program = ts.createProgram(['test.tsx'], compilerOptions, host)
    
    const transformerFactory = visualSchemaTransformer(program)
    
    let output = ''
    const writeFile = (fileName: string, data: string) => {
        output = data
    }

    const result = ts.transform(sourceFile, [transformerFactory])
    const printer = ts.createPrinter()
    output = printer.printFile(result.transformed[0])

    // Check if output contains JSX syntax markers
    const hasJSX = /<[A-Z]/.test(output) || /<\//.test(output) || /JsxElement/.test(output)

    return { output, hasJSX }
}

describe('Transformer Visitor Coverage', () => {
    describe('Context: Top-level JSX', () => {
        it('should transform top-level JSX assignment', () => {
            const code = `const app = <Counter initialCount={0} />`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('Counter')
            expect(output).toContain('initialCount')
        })

        it('should transform component with children', () => {
            const code = `const app = <Provider><Counter /></Provider>`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('Provider')
            expect(output).toContain('Counter')
        })
    })

    describe('Context: Function bodies', () => {
        it('should transform JSX in regular function', () => {
            const code = `
                function render() {
                    return <Counter initialCount={0} />
                }
            `
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('Counter')
        })

        it('should transform JSX in function with multiple statements', () => {
            const code = `
                function render() {
                    const value = 10
                    return <Counter initialCount={value} />
                }
            `
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('Counter')
        })
    })

    describe('Context: Arrow functions', () => {
        it('should transform JSX in arrow function expression', () => {
            const code = `const render = () => <Counter initialCount={0} />`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('Counter')
        })

        it('should transform JSX in arrow function with block', () => {
            const code = `
                const render = () => {
                    return <Counter initialCount={0} />
                }
            `
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('Counter')
        })

        it('should transform JSX in arrow function assigned to const', () => {
            const code = `const Home = (): HTMLElement => <div>Home</div>`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
        })
    })

    describe('Context: Nested scopes', () => {
        it('should transform JSX inside if statement', () => {
            const code = `
                function render() {
                    if (true) {
                        return <Counter />
                    }
                    return <Home />
                }
            `
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('Counter')
            expect(output).toContain('Home')
        })

        it('should transform JSX in switch case', () => {
            const code = `
                function render(route: string) {
                    switch (route) {
                        case 'counter':
                            return <Counter />
                        case 'home':
                            return <Home />
                    }
                }
            `
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('Counter')
            expect(output).toContain('Home')
        })

        it('should transform JSX in ternary expression', () => {
            const code = `const app = condition ? <Counter /> : <Home />`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('Counter')
            expect(output).toContain('Home')
        })
    })

    describe('Component Detection', () => {
        it('should detect uppercase component', () => {
            const code = `<Counter />`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('Counter')
            expect(output).not.toContain('createElement')
        })

        it('should detect property access component', () => {
            const code = `<AppContext.Provider />`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('Provider')
        })

        it('should treat lowercase as HTML element', () => {
            const code = `<div className="test" />`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('createElement')
            expect(output).toContain('div')
        })
    })

    describe('Props Handling', () => {
        it('should handle string literal props', () => {
            const code = `<Counter title="Test" />`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('title')
            expect(output).toContain('Test')
        })

        it('should handle number literal props', () => {
            const code = `<Counter initialCount={42} />`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('initialCount')
            expect(output).toContain('42')
        })

        it('should handle object literal props', () => {
            const code = `<Provider value={{ name: "App", version: "1.0" }} />`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('value')
            expect(output).toContain('name')
            expect(output).toContain('version')
        })

        it('should handle expression props', () => {
            const code = `
                const count = 5
                const app = <Counter initialCount={count * 2} />
            `
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('initialCount')
            expect(output).toContain('count')
        })

        it('should handle empty object prop', () => {
            const code = `<Provider value={{}} />`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('value')
        })

        it('should skip empty expression', () => {
            const code = `<Counter value={} />`
            const { output, hasJSX } = transformCode(code)
            
            // Should not crash, should skip the prop
            expect(hasJSX).toBe(false)
        })
    })

    describe('Children Handling', () => {
        it('should handle text children', () => {
            const code = `<div>Hello World</div>`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('Hello World')
        })

        it('should handle expression children', () => {
            const code = `
                const content = <Home />
                const app = <Provider>{content}</Provider>
            `
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('content')
        })

        it('should handle nested JSX children', () => {
            const code = `<Provider><Counter /></Provider>`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('Provider')
            expect(output).toContain('Counter')
        })

        it('should handle mixed children', () => {
            const code = `<div>Text <span>nested</span> more text</div>`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('Text')
            expect(output).toContain('nested')
        })
    })

    describe('Edge Cases', () => {
        it('should handle self-closing components', () => {
            const code = `<Counter />`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('Counter')
        })

        it('should handle components with no props', () => {
            const code = `<Counter></Counter>`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('Counter')
        })

        it('should handle hyphenated HTML attributes', () => {
            const code = `<div aria-label="test" data-id="123" />`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('setAttribute')
            expect(output).toContain('aria-label')
        })

        it('should handle fragments', () => {
            const code = `<><Counter /><Home /></>`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
        })
    })

    describe('Event Handlers', () => {
        it('should handle onClick event', () => {
            const code = `
                const handleClick = () => console.log('clicked')
                const button = <button onClick={handleClick}>Click me</button>
            `
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('addEventListener')
            expect(output).toContain('click')
            expect(output).toContain('handleClick')
        })

        it('should handle multiple event handlers', () => {
            const code = `
                <button 
                    onClick={handleClick} 
                    onMouseEnter={handleEnter}
                    onMouseLeave={handleLeave}
                >
                    Hover me
                </button>
            `
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('addEventListener')
            expect(output).toContain('click')
            expect(output).toContain('mouseenter')
            expect(output).toContain('mouseleave')
        })

        it('should handle inline arrow function event handlers', () => {
            const code = `<button onClick={(e) => console.log(e)}>Click</button>`
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('addEventListener')
            expect(output).toContain('click')
        })

        it('should handle onInput event', () => {
            const code = `
                const updateValue = (e: Event) => {
                    const target = e.target as HTMLInputElement
                    setValue(target.value)
                }
                const input = <input onInput={updateValue} />
            `
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('addEventListener')
            expect(output).toContain('input')
            expect(output).toContain('updateValue')
        })
    })

    describe('Real-world scenarios', () => {
        it('should handle routing function with JSX in switch', () => {
            const code = `
                function renderRoute(route: string) {
                    let content: HTMLElement
                    
                    switch (route) {
                        case '/counter':
                            content = <Counter initialCount={0} />
                            break
                        case '/todo':
                            content = <TodoApp initialTodos={[]} />
                            break
                        default:
                            content = <Home />
                    }
                    
                    return (
                        <AppContext.Provider value={{ name: "App" }}>
                            {content}
                        </AppContext.Provider>
                    )
                }
            `
            const { output, hasJSX } = transformCode(code)
            
            expect(hasJSX).toBe(false)
            expect(output).toContain('Counter')
            expect(output).toContain('TodoApp')
            expect(output).toContain('Home')
            expect(output).toContain('AppContext')
        })
    })
})
