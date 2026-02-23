import { test, describe } from 'node:test';
import assert from 'node:assert';
import { promisePool, POOL_STOP_SIGNAL, TIMEOUT_SIGNAL } from './index.ts';

describe('_validateInput', () => {
  test('should return error when input is missing', async () => {
    const task = async (n: number) => n;
    
    const { errors } = await promisePool({ input: null as any, process: task, concurrency: 2 });
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].message, 'input is required');
  });

  test('should return error when process is not a function', async () => {
    const items = [1, 2, 3];
    
    const { errors } = await promisePool({ input: items, process: 'not a function' as any, concurrency: 2 });
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].message, 'process must be a function');
  });

  test('should return error when concurrency is not a positive number', async () => {
    const items = [1, 2, 3];
    const task = async (n: number) => n;
    
    const { errors } = await promisePool({ input: items, process: task, concurrency: 0 });
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].message, 'concurrency must be a positive number');
  });

  test('should return error when concurrency is negative', async () => {
    const items = [1, 2, 3];
    const task = async (n: number) => n;
    
    const { errors } = await promisePool({ input: items, process: task, concurrency: -5 });
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].message, 'concurrency must be a positive number');
  });

  test('should return error when concurrency is not a number', async () => {
    const items = [1, 2, 3];
    const task = async (n: number) => n;
    
    const { errors } = await promisePool({ input: items, process: task, concurrency: 'not a number' as any });
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].message, 'concurrency must be a positive number');
  });

  test('should return error when onError is not a function or undefined', async () => {
    const items = [1, 2, 3];
    const task = async (n: number) => n;
    
    const { errors } = await promisePool({ input: items, process: task, concurrency: 2, onError: 'not a function' as any });
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].message, 'onError must be a function');
  });

  test('should allow undefined onError', async () => {
    const items = [1, 2, 3];
    const task = async (n: number) => n * 2;
    
    const { results, errors } = await promisePool({ input: items, process: task, concurrency: 2, onError: undefined });
    assert.strictEqual(results.length, 3);
    assert.strictEqual(errors.length, 0);
  });
});

describe('promisePool', () => {
  
  test('should process all items successfully (Happy Path)', async () => {
    const items = [1, 2, 3];
    const task = async (n: number) => n * 2;
    
    const { results, errors } = await promisePool({ input: items, process: task, concurrency: 2 });
    
    assert.strictEqual(results.length, 3);
    assert.deepStrictEqual(results.sort(), [2, 4, 6]);
    assert.strictEqual(errors.length, 0);
  });

  test('should respect concurrency limits', async () => {
    const concurrency = 2;
    let activeTasks = 0;
    let maxParallel = 0;

    const task = async () => {
      activeTasks++;
      maxParallel = Math.max(maxParallel, activeTasks);
      await new Promise(res => setTimeout(res, 50));
      activeTasks--;
    };

    await promisePool({ input: [1, 2, 3, 4, 5], process: task, concurrency });
    
    assert.strictEqual(maxParallel, concurrency, `Should not exceed ${concurrency} parallel tasks`);
  });

  test('should handle AsyncIterables (Streams)', async () => {
    async function* asyncGen() {
      yield 'a';
      yield 'b';
    }
    
    const { results } = await promisePool({ input: asyncGen(), process: async (s) => s.toUpperCase() });
    assert.deepStrictEqual(results.sort(), ['A', 'B']);
  });

  test('should collect errors and failed items', async () => {
    const items = [1, 'error', 3];
    const task = async (item: any) => {
      if (typeof item === 'string') throw new Error('Boom');
      return item;
    };

    const { results, errors, failedItems } = await promisePool({ input: items, process: task });

    assert.strictEqual(results.length, 2);
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].message, 'Boom');
    assert.deepStrictEqual(failedItems, ['error']);
  });

  test('should stop execution when POOL_STOP_SIGNAL is returned', async () => {
const items = [1, 2, 3];
    let callCount = 0;

    const { errors, stoppedPrematurely, failedItems } = await promisePool({
      input: items,
      process: async (n) => { 
        callCount++; 
        throw new Error(`Stop at ${n}`); 
      },
      concurrency: 1,
      onError: () => POOL_STOP_SIGNAL 
    });

    assert.strictEqual(callCount, 1, 'Should only process the first item');
    assert.strictEqual(stoppedPrematurely, true, 'stoppedPrematurely should be true');
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].message, 'Stop at 1');
    assert.deepStrictEqual(failedItems, [1]);
  });


  test('should handle empty input', async () => {
    const { results } = await promisePool({ input: [], process: async (i) => i });
    assert.deepStrictEqual(results, []);
  });

  test('should support async error handlers', async () => {
    let handlerWaited = false;
    const items = [1];
    
    await promisePool({
      input: items,
      process: async () => { throw new Error(); },
      concurrency: 1,
      onError: async () => {
        await new Promise(res => setTimeout(res, 20));
        handlerWaited = true;
      }
    });

    assert.strictEqual(handlerWaited, true);
  });

  test('should handle timeouts', async () => {
    const items = [1];
    
    const { errors } = await promisePool({
      input: items,
      process: async () => new Promise(res => setTimeout(res, 100)),
      concurrency: 1,
      timeout: 50
    });

    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0], TIMEOUT_SIGNAL);
  });

  test('should allow onError to mutate/replace the original error', async () => {
    const items = [1];
    
    const { errors, failedItems } = await promisePool({
      input: items,
      process: async () => { throw new Error('Original Error'); },
      concurrency: 1,
      onError: () => new Error('Mutated Error') // Returning a new error
    });

    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].message, 'Mutated Error', 'The error should be replaced');
    assert.deepStrictEqual(failedItems, [1]);
  });

  test('should safely abort and capture the error if onError itself throws', async () => {
    const items = [1, 2, 3];
    let callCount = 0;

    const { errors, stoppedPrematurely, failedItems } = await promisePool({
      input: items,
      process: async (n) => { 
        callCount++;
        throw new Error(`Process Error ${n}`); 
      },
      concurrency: 1,
      onError: () => { throw new Error('Handler Crash'); } // Handler fails
    });

    assert.strictEqual(callCount, 1, 'Should abort immediately after handler crashes');
    assert.strictEqual(stoppedPrematurely, true, 'stoppedPrematurely should be true');
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].message, 'Handler Crash', 'Should capture the handler error');
    assert.deepStrictEqual(failedItems, [1]);
  });

  test('should allow replacing TIMEOUT_SIGNAL with a standard Error', async () => {
    const items = [1];
    
    const { errors } = await promisePool({
      input: items,
      process: async () => new Promise(res => setTimeout(res, 100)),
      concurrency: 1,
      timeout: 10,
      onError: (err) => {
        if (err === TIMEOUT_SIGNAL) {
          return new Error('Custom timeout error');
        }
      }
    });

    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].message, 'Custom timeout error', 'Timeout symbol should be replaced');
  });
});
