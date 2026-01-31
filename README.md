# @mystogab/promise-pool 🚀

A lightweight, high-performance, and memory-efficient asynchronous pool for JavaScript and TypeScript. Designed for **modern Node.js** environments (20+).

[![npm version](https://img.shields.io)](https://www.npmjs.com)
[![License: MIT](https://img.shields.io)](https://opensource.org)
![Bundle Size](https://img.shields.io)

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

const { results } = await promisePool(items, task, 2);
console.log(results);
```

## Advanced Error Handling & Early Stop
You can stop the entire pool if a critical error occurs (e.g., Auth Token expired) using the `POOL_STOP_SIGNAL`.

```typescript
import { promisePool, POOL_STOP_SIGNAL } from '@mystogab/promise-pool';

const { results, stoppedPrematurely } = await promisePool(
  hugeDataset,
  processData,
  5, // Concurrency
  async (error, item) => {
    if (error.status === 401) {
      console.error("Critical error! Stopping pool...");
      return POOL_STOP_SIGNAL;
    }
    console.warn(`Failed item ${item.id}: ${error.message}`);
  }
);
```
## Performance Comparison

| Feature | Standard Promise.all | Common "Batch" Pools | @mystogab/promise-pool |
|---------|----------------------|----------------------|--------------------|
| Memory Usage | High (loads everything) | Medium | Ultra Low (Worker-based) |
| Idle Time | None | High (waits for slowest) | Zero (Continuous flow) |
| Async Iterators | No | Limited | Native Support |
| Stop Signal | No | Manual/Complex | Elegant Symbol Signal |

## API Reference
`promisePool<T, R>(input, iteratorFn, concurrency?, errorHandler?)`

Parameters:
- `input`: `Iterable<T> | AsyncIterable<T>` - The data to process.
- `iteratorFn`: `(item: T) => Promise<R>` - The async function to run for each item.
- `concurrency`: `number` (Default: `2`) - Max number of simultaneous tasks.
- `errorHandler`: `(error: any, item: T) => void | Promise<void> | typeof POOL_STOP_SIGNAL` - Optional handler for custom logic on failure.

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

### [1.0.1] - 2026-01-31
- Added project keywords

### [1.0.0] - 2026-01-31
- Initial release
- Core promise pool functionality with dynamic worker queue
- Support for Iterable and AsyncIterable inputs
- POOL_STOP_SIGNAL for graceful termination
- Dual ESM/CommonJS build support
- Zero dependencies
