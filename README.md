# @pulsar/vite-plugin

Vite plugin for the pulsar framework. Transforms TSX syntax into direct DOM manipulation using the pulsar compiler.

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

## What it does

The plugin automatically transforms all `.tsx` files in your project, converting JSX syntax into optimized direct DOM manipulation code using the pulsar transformer.

### Before transformation:
```tsx
const Counter = () => {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

### After transformation:
Direct DOM operations with fine-grained reactive updates - no virtual DOM overhead.

## Options

Currently, the plugin works with zero configuration. Future versions may add options for:
- Custom transformer configuration
- Include/exclude patterns
- Debug logging levels

## License

MIT
