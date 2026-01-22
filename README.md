<img src="https://raw.githubusercontent.com/binaryjack/pulsar-design-system/main/art-kit/SVG/pulsar-logo.svg" alt="Pulsar" width="400"/>

# @pulsar/vite-plugin

Vite plugin that integrates the Pulsar transformer into your build process, converting TSX syntax into direct DOM manipulation.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue)](https://www.linkedin.com/in/tadeopiana/)

## Features

- ✅ **Zero-config integration** - Works out of the box with Vite
- ✅ **Automatic TSX transformation** - Converts all `.tsx` files
- ✅ **Fast HMR** - Hot Module Replacement support
- ✅ **TypeScript support** - Full type checking during build
- ✅ **Development warnings** - Detects untransformed JSX in dev mode
- ✅ **Production optimized** - Strips debug code in production builds
- ✅ Seamless integration with Pulsar transformer

## Installation

```bash
pnpm add -D @pulsar/vite-plugin
```

## Usage

Add the plugin to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import { pulsarPlugin } from '@pulsar/vite-plugin'

export default defineConfig({
  plugins: [
    pulsarPlugin()
  ]
})
```

That's it! The plugin will automatically:
1. Transform all `.tsx` files using the Pulsar transformer
2. Convert JSX into direct DOM operations
3. Enable fine-grained reactive updates
4. Provide fast HMR during development

## How It Works

The plugin integrates into Vite's transform pipeline:

1. **File Detection**: Identifies `.tsx` files
2. **TypeScript Compilation**: Creates TypeScript program with JSX preserved
3. **Transformation**: Applies Pulsar transformer to convert JSX → DOM
4. **Validation**: Checks for any remaining JSX nodes (dev mode)
5. **Output**: Returns transformed JavaScript code

### Before Transformation
```tsx
const Counter = () => {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count()}</button>
}
```

### After Transformation
```javascript
const Counter = () => {
  const [count, setCount] = useState(0)
  const el = document.createElement('button')
  el.addEventListener('click', () => setCount(count + 1))
  
  const textNode = document.createTextNode('')
  createEffect(() => {
    textNode.textContent = String(count())
  })
  el.appendChild(textNode)
  
  return el
}
```

## Configuration Options

Currently, the plugin works with zero configuration. Future versions may add options for:

```typescript
pulsarPlugin({
  // Include/exclude patterns
  include?: string | RegExp | Array<string | RegExp>
  exclude?: string | RegExp | Array<string | RegExp>
  
  // Transformer configuration
  optimize?: boolean
  optimizerConfig?: {
    removeUnusedVariables?: boolean
    inlineConstants?: boolean
  }
  
  // Debug options
  debug?: boolean
  logTransformations?: boolean
})
```

## Development Mode

In development, the plugin provides helpful warnings:

```bash
[pulsar] Processing: Counter.tsx
[pulsar] Transformed Counter.tsx
[pulsar] WARNING: React still found in output! # If transformation incomplete
[pulsar] ERROR: Transformed AST still contains JSX nodes! # If JSX remains
```

## Integration with Vite

The plugin integrates seamlessly with Vite features:

### Hot Module Replacement (HMR)
```typescript
// Automatic HMR - no configuration needed
if (import.meta.hot) {
  import.meta.hot.accept()
}
```

### Build Optimization
```typescript
export default defineConfig({
  plugins: [pulsarPlugin()],
  build: {
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['pulsar']
        }
      }
    }
  }
})
```

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxFactory": "jsx",
    "jsxFragmentFactory": "Fragment",
    "jsxImportSource": "pulsar"
  }
}
```

## Complete Example

**vite.config.ts**
```typescript
import { defineConfig } from 'vite'
import { pulsarPlugin } from '@pulsar/vite-plugin'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    pulsarPlugin()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    include: [
      'pulsar',
      'pulsar/reactivity',
      'pulsar/hooks',
      'pulsar/jsx-runtime'
    ]
  },
  esbuild: {
    jsxFactory: 'jsx',
    jsxFragment: 'Fragment',
    jsxInject: `import { jsx, Fragment } from 'pulsar/jsx-runtime'`
  }
})
```

**tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "jsx": "preserve",
    "jsxFactory": "jsx",
    "jsxFragmentFactory": "Fragment",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## Troubleshooting

### JSX Still Present After Transformation

If you see JSX in the output:
1. Ensure `jsx: "preserve"` in `tsconfig.json`
2. Check that files have `.tsx` extension
3. Verify plugin is in the `plugins` array

### React References in Output

The transformer removes React completely. If you see React:
1. Check your imports - remove `import React from 'react'`
2. Use Pulsar's JSX runtime: `import { jsx } from 'pulsar/jsx-runtime'`
3. Ensure no other plugins are adding React

### Type Errors

If TypeScript complains about JSX:
1. Add `pulsar.d.ts` to your project for JSX type definitions
2. Include `"types": ["pulsar"]` in `tsconfig.json`
3. Restart TypeScript server in your IDE

## Performance

The plugin is designed for optimal build performance:
- **Incremental transformation** - Only transforms changed files
- **Parallel processing** - Utilizes Vite's parallelization
- **Fast HMR** - Sub-100ms hot updates
- **Minimal overhead** - Direct AST transformation without serialization

## Roadmap

### Completed ✅
- Zero-config Vite integration
- Automatic TSX file transformation
- TypeScript program creation for transformation
- Development mode validation
- JSX detection and warnings
- Seamless HMR integration

### In Progress 🚧
- Configuration options for include/exclude patterns
- Debug logging levels
- Transformer optimization flags

### Planned 📋
- **Source maps** - Full source map support for debugging
- **Custom transformers** - Plugin API for custom transformations
- **Bundle analysis** - Visualize transformation impact
- **Caching layer** - Cache transformed files across builds
- **Worker threads** - Parallelize transformation for large projects
- **Watch mode optimization** - Smarter incremental rebuilds
- **SSR support** - Server-side rendering compatibility
- **Module federation** - Support for micro-frontends
- **Production diagnostics** - Optional runtime performance tracking

## Pulsar Ecosystem

| Package | Description | Status |
|---------|-------------|--------|
| [pulsar.dev](https://github.com/binaryjack/pulsar.dev) | Core framework with signal-based reactivity | ✅ Active |
| [@pulsar/ui](https://github.com/binaryjack/pulsar-ui.dev) | UI component library | ✅ Active |
| [@pulsar/design-tokens](https://github.com/binaryjack/pulsar-design-system) | Design tokens & art-kit | ✅ Active |
| [@pulsar/transformer](https://github.com/binaryjack/pulsar-transformer) | JSX to DOM compiler | ✅ Active |
| [@pulsar/vite-plugin](https://github.com/binaryjack/pulsar-vite-plugin) | Vite integration | ✅ Active |
| [@pulsar/demo](https://github.com/binaryjack/pulsar-demo) | Example applications | ✅ Active |

## Contributing

We welcome contributions! To get started:

1. **Clone the repository**
   ```bash
   git clone https://github.com/binaryjack/pulsar-vite-plugin.git
   cd pulsar-vite-plugin
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Link for local development**
   ```bash
   pnpm link --global
   cd ../your-project
   pnpm link @pulsar/vite-plugin --global
   ```

4. **Test your changes**
   ```bash
   # In a test project
   pnpm dev
   ```

### Development Tips

- **Plugin structure**: Check [vite-plugin-temp/src/index.ts](./vite-plugin-temp/src/index.ts)
- **Testing**: Use [@pulsar/demo](../pulsar-demo) as a test bed
- **Debugging**: Add `console.log` statements in the `transform` function
- **Vite API**: Reference [Vite Plugin API docs](https://vitejs.dev/guide/api-plugin.html)

## License

MIT License - Copyright (c) 2026 Pulsar Framework

See [LICENSE](../pulsar.dev/LICENSE) file for details.

---

**Connect:** [LinkedIn](https://www.linkedin.com/in/tadeopiana/) • **Explore:** [Pulsar Ecosystem](#pulsar-ecosystem)
