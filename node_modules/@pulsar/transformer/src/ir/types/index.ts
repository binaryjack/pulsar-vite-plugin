import * as ts from 'typescript'

// Intermediate Representation Types

export interface IComponentIR {
    name: string
    props: IPropsIR
    hooks: IHookIR[]
    jsx: IJSXElementIR
    effects: IEffectIR[]
}

export interface IPropsIR {
    typeName?: string
    properties: IPropertyIR[]
}

export interface IPropertyIR {
    name: string
    type: string
    optional: boolean
    defaultValue?: any
}

export interface IJSXElementIR {
    type: 'element' | 'fragment' | 'component' | 'expression' | 'text'
    tag?: string
    props: IPropIR[]
    children: (IJSXElementIR | IExpressionIR | ITextIR)[]
    isStatic: boolean
    hasDynamicChildren: boolean
    events: IEventIR[]
    key?: string
}

export interface IPropIR {
    name: string
    value: ts.Expression
    isStatic: boolean
    isDynamic: boolean
    dependsOn: string[]
}

export interface IEventIR {
    type: string
    handler: ts.Expression
    modifiers: string[]
}

export interface IExpressionIR {
    type: 'expression'
    expression: ts.Expression
    isStatic: boolean
    dependsOn: string[]
}

export interface ITextIR {
    type: 'text'
    content: string
    isStatic: true
}

export interface IEffectIR {
    dependencies: string[]
    effectNode: ts.Node
    cleanupNode?: ts.Node
}

export interface IHookIR {
    type: 'useState' | 'useEffect' | 'useMemo' | 'useCallback' | 'useRef'
    variable: string
    args: ts.Expression[]
    dependencies?: string[]
}
