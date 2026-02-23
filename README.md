<div align="center">

![@mystogab/promise-pool 🚀](mgpp.svg)
<br><br>
A lightweight, high-performance, and memory-efficient asynchronous pool for JavaScript and TypeScript. Designed for **modern Node.js** environments (20+).
<br><br>

[![npm version](https://img.shields.io/npm/v/@mystogab/promise-pool)](https://www.npmjs.com)
[![License: MIT](https://img.shields.io/npm/l/@mystogab/promise-pool)](https://opensource.org)
![Bundle Size](https://img.shields.io/bundlephobia/min/%40mystogab%2Fpromise-pool)
<br><br>
</div>

## Why Promise Pool?

Unlike other libraries that use "batching" (waiting for the slowest task in a group to finish), **@mystogab/promise-pool** uses a **Dynamic Worker Queue**. As soon as a task finishes, a worker picks up the next one immediately.

- **Safe by Default:** Never throws - validation and processing errors are returned in the result object
- **Built-in Timeouts:** Prevent "zombie" tasks by setting a time limit for individual executions.
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
  process: task,
  concurrency: 2
});
console.log(results) // ["Result 1", "Result 2", ...];
```

## Error Mutation & Timeouts
Ensure your pool doesn't hang if a task takes too long.

You can now use onError to transform errors before they are collected. This is especially useful for replacing the internal TIMEOUT_SIGNAL with a standard Error object.

```typescript
import { promisePool, TIMEOUT_SIGNAL } from '@mystogab/promise-pool';

const { errors } = await promisePool({
  input: items,
  process: slowTask,
  timeout: 2000, // 2 seconds limit per task
  onError: (error, item) => {
    if (error === TIMEOUT_SIGNAL) {
      // Mutate the error: return a standard Error instead of the Symbol
      return new Error(`Task for item ${item.id} exceeded 2000ms`);
    }
  }
});

console.log(errors.every(err => err instanceof Error)); // true
```

## Advanced Error Handling & Early Stop
You can stop the entire pool if a critical error occurs (e.g., Auth Token expired) using the `POOL_STOP_SIGNAL`.

If a critical error occurs, return `POOL_STOP_SIGNAL`. If your `onError` handler itself throws an error, the pool will capture that error and stop automatically to prevent inconsistent states.

```typescript
import { promisePool, POOL_STOP_SIGNAL } from '@mystogab/promise-pool';

const { results, stoppedPrematurely } = await promisePool({
  input: hugeDataset,
  process: processData,
  concurrency: 5,
  onError: async (error, item) => {
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
| Native Timeout | No | Rare | Yes |
| Async Iterators | No | Limited | Native Support |
| Stop Signal | No | Manual/Complex | Elegant Symbol Signal |

## API Reference

### `promisePool<T, R>(options)`

Options object parameters:
- `input`: `Iterable<T> | AsyncIterable<T>` - The data to process.
- `process`: `(item: T) => Promise<R>` - The async function to run for each item.
- `concurrency`: `number` (Default: `2`) - Max number of simultaneous tasks.
- `timeout`: `number` (Optional) - Time limit in milliseconds for each task.
- `onError`: `(error: any, item: T) => void | Promise<void> | typeof POOL_STOP_SIGNAL` (Optional) - Handler for custom logic on failure.

Returns: `Promise<PoolResult<T, R>>`
- `results`: `R[]` - Array of successful results in the order they were processed.
- `errors`: `Error[]` - Array of errors encountered during processing.
- `failedItems`: `T[]` - Array of items that failed to process.
- `stoppedPrematurely`: `boolean` - Whether the pool was stopped early via `POOL_STOP_SIGNAL`.

## Benchmarking
You can measure the performance in your own environment:

```javascript
console.time('Pool Speed');
const { results, errors } = await promisePool({
  input: data,
  process: task,
  concurrency: 10
});
console.timeEnd('Pool Speed');
```

## License
MIT © [@Mystogab]
## Changelog

### **v3.2.0** | 2026-02-23
- **Feature**: Added Error Mutation. The onError handler can now return a new Error object to replace the original error in the final errors array.
- **Fixed**: Improved onError safety. If the error handler itself throws an exception, the pool now captures that error and triggers a safe abort instead of crashing the process.
- **Improved**: Documentation updated with mutation examples and logic flow.

[[ EXTENDED CHANGELOG ]](CHANGELOG.md)
