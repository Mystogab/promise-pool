# @mystogab/promise-pool 🚀

A lightweight, high-performance, and memory-efficient asynchronous pool for JavaScript and TypeScript. Designed for **modern Node.js** environments (20+).

[![npm version](https://img.shields.io/npm/v/@mystogab/promise-pool)](https://www.npmjs.com)
[![License: MIT](https://img.shields.io/npm/l/@mystogab/promise-pool)](https://opensource.org)
![Bundle Size](https://img.shields.io/bundlephobia/min/%40mystogab%2Fpromise-pool)

## Why Promise Pool?

Unlike other libraries that use "batching" (waiting for the slowest task in a group to finish), **@mystogab/promise-pool** uses a **Dynamic Worker Queue**. As soon as a task finishes, a worker picks up the next one immediately.

- **Stream-Friendly:** Supports `Iterable` and `AsyncIterable`. Process millions of items without loading them all into memory.
- **Smart Control:** Stop execution gracefully using `POOL_STOP_SIGNAL`.
- **Dual Build:** Native support for ESM and CommonJS.
- **Zero Dependencies:** Ultra-light footprint for your project.

---

## Installation

```bash
npm i @mystogab/promise-pool
```
## Quick Start
## Basic Usage
```typescript
import { promisePool } from '@mystogab/promise-pool';

const items = [1, 2, 3, 4, 5];
const task = async (id) => {
  await new Promise(r => setTimeout(r, 100));
  return `Result ${id}`;
};

const { results } = await promisePool({
  input: items,
  iteratorFn: task,
  concurrency: 2
});
console.log(results);
```

## Advanced Error Handling & Early Stop
You can stop the entire pool if a critical error occurs (e.g., Auth Token expired) using the `POOL_STOP_SIGNAL`.

```typescript
import { promisePool, POOL_STOP_SIGNAL } from '@mystogab/promise-pool';

const { results, stoppedPrematurely } = await promisePool({
  input: hugeDataset,
  iteratorFn: processData,
  concurrency: 5,
  errorHandler: async (error, item) => {
    if (error.status === 401) {
      console.error("Critical error! Stopping pool...");
      return POOL_STOP_SIGNAL;
    }
    console.warn(`Failed item ${item.id}: ${error.message}`);
  }
});
```
## Performance Comparison

| Feature | Standard Promise.all | Common "Batch" Pools | @mystogab/promise-pool |
|---------|----------------------|----------------------|--------------------|
| Memory Usage | High (loads everything) | Medium | Ultra Low (Worker-based) |
| Idle Time | None | High (waits for slowest) | Zero (Continuous flow) |
| Async Iterators | No | Limited | Native Support |
| Stop Signal | No | Manual/Complex | Elegant Symbol Signal |

## API Reference

### `promisePool<T, R>(options)`

Options object parameters:
- `input`: `Iterable<T> | AsyncIterable<T>` - The data to process.
- `iteratorFn`: `(item: T) => Promise<R>` - The async function to run for each item.
- `concurrency`: `number` (Default: `2`) - Max number of simultaneous tasks.
- `errorHandler`: `(error: any, item: T) => void | Promise<void> | typeof POOL_STOP_SIGNAL` (Optional) - Handler for custom logic on failure.

Returns: `Promise<PoolResult<T, R>>`
- `results`: `R[]` - Array of successful results in the order they were processed.
- `errors`: `Error[]` - Array of errors encountered during processing.
- `failedItems`: `T[]` - Array of items that failed to process.
- `stoppedPrematurely`: `boolean` - Whether the pool was stopped early via `POOL_STOP_SIGNAL`.

## Benchmarking
You can measure the performance in your own environment:

```javascript
console.time('Pool Speed');
await promisePool(data, tasks, 10);
console.timeEnd('Pool Speed');
```

## License
MIT © [@Mystogab]
## Changelog

### **v2.0.0** | 2026-02-13
- **BREAKING:** Changed API to use named parameters instead of positional arguments
- Updated `promisePool()` to accept a single options object with `input`, `iteratorFn`, `concurrency`, and `errorHandler` properties
- Improved type safety and code clarity with explicit parameter names
- Updated all documentation examples and API reference
- Updated comprehensive test suite to match new API

### **v1.1.2** | 2026-02-03
- Added GitHub link reference
- Fixed documentation badges
- Modified changelog style
- Small typo fix

### **v1.1.0** | 2026-02-02
- Added input validation function `_validateInput` to ensure all parameters are correct
- Added needed unit tests
- Added comprehensive test suite for parameter validation
- Added `Returns` section to API Reference documentation

### **v1.0.1** | 2026-01-31
- Added project keywords

### **v1.0.0** | 2026-01-31
- Initial release
- Core promise pool functionality with dynamic worker queue
- Support for Iterable and AsyncIterable inputs
- POOL_STOP_SIGNAL for graceful termination
- Dual ESM/CommonJS build support
- Zero dependencies
