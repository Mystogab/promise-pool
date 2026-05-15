# @mystogab/promise-pool Project Agent

## Overview
A lightweight, high-performance, and memory-efficient asynchronous pool for JavaScript and TypeScript. Designed for modern Node.js environments (20+).

## Key Features
- **Dynamic Worker Queue**: As soon as a task finishes, a worker picks up the next one immediately
- **Safe by Default**: Never throws - validation and processing errors are returned in the result object
- **Built-in Timeouts**: Prevent "zombie" tasks by setting a time limit for individual executions
- **Stream-Friendly**: Supports `Iterable` and `AsyncIterable`. Process millions of items without loading them all into memory
- **Smart Control**: Stop execution gracefully using `POOL_STOP_SIGNAL`
- **Dual Build**: Native support for ESM and CommonJS
- **Zero Dependencies**: Ultra-light footprint for your project

## Core API
- `promisePool()`: Main function to process items with configurable concurrency
- `POOL_STOP_SIGNAL`: Symbol to gracefully stop execution
- `TIMEOUT_SIGNAL`: Symbol for timeout handling

## Implementation Details
- Uses dynamic worker queue pattern for optimal performance
- Handles both sync and async iterables
- Supports error handling with optional onError callback
- Implements timeout functionality with Promise.race
- Validates inputs and returns structured results with errors, failed items, and results

## Usage Patterns
- Basic usage with concurrency control
- Error handling with graceful stopping via POOL_STOP_SIGNAL
- Timeout support for preventing hanging tasks
- Stream processing of large datasets

## Documentation References
- **Release Process**: skills/RELEASE.md
- **Missing Features**: skills/MISSING_FEATURES.md