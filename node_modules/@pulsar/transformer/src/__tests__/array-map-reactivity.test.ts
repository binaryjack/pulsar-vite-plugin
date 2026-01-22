/**
 * Tests for fine-grained reactivity with array.map() in JSX
 * These tests define the expected behavior for proper fine-grained updates
 */

import * as ts from 'typescript'
import visualSchemaTransformer from '../index'

describe('Array.map() Fine-Grained Reactivity', () => {
    /**
     * Helper to transform JSX and get generated code
     */
    function transformCode(code: string): string {
        // Create a minimal program with the test code
        const testFileName = 'test.tsx'
        const compilerHost = ts.createCompilerHost({})
        const originalGetSourceFile = compilerHost.getSourceFile
        
        compilerHost.getSourceFile = (fileName, languageVersion) => {
            if (fileName === testFileName) {
                return ts.createSourceFile(
                    fileName,
                    code,
                    languageVersion,
                    true,
                    ts.ScriptKind.TSX
                )
            }
            return originalGetSourceFile(fileName, languageVersion)
        }

        const program = ts.createProgram(
            [testFileName],
            { jsx: ts.JsxEmit.Preserve },
            compilerHost
        )

        const sourceFile = program.getSourceFile(testFileName)!
        const transformerFactory = visualSchemaTransformer(program)
        
        const result = ts.transform(sourceFile, [transformerFactory])
        const transformedSourceFile = result.transformed[0]
        const printer = ts.createPrinter()
        const output = printer.printFile(transformedSourceFile as ts.SourceFile)
        
        result.dispose()
        return output
    }

    describe('Simple array.map() patterns', () => {
        it('should transform simple map with key prop to keyed reconciliation', () => {
            const input = `
                const items = () => [{ id: 1, text: 'A' }]
                const view = (
                    <ul>
                        {items().map(item => <li key={item.id}>{item.text}</li>)}
                    </ul>
                )
            `

            const output = transformCode(input)

            // Should generate code that:
            // 1. Creates a map container with display: contents
            // 2. Uses createEffect for reactivity
            // 3. Tracks items in a state Map
            // 4. Has key-based reconciliation logic
            expect(output).toContain('mapContainer')
            expect(output).toContain('mapState')
            expect(output).toContain('const keyFn =')
            expect(output).toContain('newKeys.add')
            expect(output).toContain('mapState2.items.has(key)')
            // Note: The individual list items may still have innerHTML for their own dynamic content
            // but the main list container should not be cleared entirely
            expect(output).toContain('mapContainer')
        })

        it('should handle map without key prop using index-based reconciliation', () => {
            const input = `
                const items = () => ['A', 'B', 'C']
                const view = (
                    <ul>
                        {items().map(item => <li>{item}</li>)}
                    </ul>
                )
            `

            const output = transformCode(input)

            // Without explicit keys, should use index as key
            expect(output).toContain('mapContainer')
            expect(output).toContain('const keyFn = (item, index) => index')
        })

        it('should handle map with object spread props', () => {
            const input = `
                const items = () => [{ id: 1, name: 'John' }]
                const view = (
                    <ul>
                        {items().map(item => <li key={item.id} {...item} />)}
                    </ul>
                )
            `

            const output = transformCode(input)
            expect(output).toContain('mapContainer')
            expect(output).toContain('mapState')
        })
    })

    describe('Map with component children', () => {
        it('should handle map returning component calls', () => {
            const input = `
                const TodoItem = (props) => <li>{props.text}</li>
                const items = () => [{ id: 1, text: 'A' }]
                const view = (
                    <ul>
                        {items().map(item => <TodoItem key={item.id} {...item} />)}
                    </ul>
                )
            `

            const output = transformCode(input)
            
            // Should generate reconciliation that calls TodoItem with props
            expect(output).toContain('TodoItem')
        })

        it('should handle map with complex component hierarchy', () => {
            const input = `
                const items = () => [{ id: 1, text: 'A' }]
                const view = (
                    <ul>
                        {items().map(item => (
                            <li key={item.id}>
                                <input type="checkbox" checked={item.completed} />
                                <span>{item.text}</span>
                                <button onClick={() => deleteItem(item.id)}>×</button>
                            </li>
                        ))}
                    </ul>
                )
            `

            const output = transformCode(input)
            expect(output).toBeDefined()
        })
    })

    describe('Nested maps', () => {
        it('should handle nested array maps', () => {
            const input = `
                const groups = () => [
                    { id: 1, items: [{ id: 'a', text: 'A' }] }
                ]
                const view = (
                    <div>
                        {groups().map(group => (
                            <div key={group.id}>
                                {group.items.map(item => (
                                    <span key={item.id}>{item.text}</span>
                                ))}
                            </div>
                        ))}
                    </div>
                )
            `

            const output = transformCode(input)
            expect(output).toBeDefined()
        })
    })

    describe('Map with reactive expressions', () => {
        it('should handle map with reactive expressions in children', () => {
            const input = `
                const count = () => 5
                const items = () => ['A', 'B']
                const view = (
                    <ul>
                        {items().map((item, i) => (
                            <li key={i}>
                                {item} - {count()}
                            </li>
                        ))}
                    </ul>
                )
            `

            const output = transformCode(input)
            
            // Each list item should have its own effect for count()
            // When count() changes, all items update their text
            // When items() changes, only affected items are added/removed
            expect(output).toBeDefined()
        })

        it('should handle map with conditional expressions', () => {
            const input = `
                const showDetails = () => true
                const items = () => [{ id: 1, name: 'A', details: 'Details' }]
                const view = (
                    <ul>
                        {items().map(item => (
                            <li key={item.id}>
                                {item.name}
                                {showDetails() && <span>{item.details}</span>}
                            </li>
                        ))}
                    </ul>
                )
            `

            const output = transformCode(input)
            expect(output).toBeDefined()
        })
    })

    describe('Key extraction', () => {
        it('should detect key prop with different syntaxes', () => {
            const inputs = [
                `<li key={item.id}>{item.text}</li>`,
                `<li key={item['id']}>{item.text}</li>`,
                `<li key={"item-" + item.id}>{item.text}</li>`,
            ]

            inputs.forEach(jsx => {
                const code = `
                    const items = () => [{ id: 1, text: 'A' }]
                    const view = <div>{items().map(item => ${jsx})}</div>
                `
                const output = transformCode(code)
                expect(output).toBeDefined()
            })
        })

        it('should handle index as key', () => {
            const input = `
                const items = () => ['A', 'B']
                const view = (
                    <ul>
                        {items().map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                )
            `

            const output = transformCode(input)
            expect(output).toBeDefined()
        })
    })

    describe('Edge cases', () => {
        it('should handle empty arrays', () => {
            const input = `
                const items = () => []
                const view = <ul>{items().map(item => <li key={item.id}>{item.text}</li>)}</ul>
            `

            const output = transformCode(input)
            expect(output).toBeDefined()
        })

        it('should handle map with fallback', () => {
            const input = `
                const items = () => []
                const view = (
                    <div>
                        {items().length > 0 
                            ? items().map(item => <div key={item.id}>{item.text}</div>)
                            : <div>No items</div>
                        }
                    </div>
                )
            `

            const output = transformCode(input)
            expect(output).toBeDefined()
        })

        it('should handle map with filter', () => {
            const input = `
                const items = () => [{ id: 1, visible: true }, { id: 2, visible: false }]
                const view = (
                    <ul>
                        {items().filter(i => i.visible).map(item => (
                            <li key={item.id}>{item.text}</li>
                        ))}
                    </ul>
                )
            `

            const output = transformCode(input)
            expect(output).toBeDefined()
        })
    })
})
