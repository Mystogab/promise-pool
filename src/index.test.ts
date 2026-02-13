import { test, describe } from 'node:test';
import assert from 'node:assert';
import { promisePool, POOL_STOP_SIGNAL } from './index.ts';

describe('_validateInput', () => {
  test('should throw when input is missing', async () => {
    const task = async (n: number) => n;
    
    await assert.rejects(
      () => promisePool({ input: null as any, iteratorFn: task, concurrency: 2 }),
      { message: 'input is required' }
    );
  });

  test('should throw when iteratorFn is not a function', async () => {
    const items = [1, 2, 3];
    
    await assert.rejects(
      () => promisePool({ input: items, iteratorFn: 'not a function' as any, concurrency: 2 }),
      { message: 'iteratorFn must be a function' }
    );
  });

  test('should throw when concurrency is not a positive number', async () => {
    const items = [1, 2, 3];
    const task = async (n: number) => n;
    
    await assert.rejects(
      () => promisePool({ input: items, iteratorFn: task, concurrency: 0 }),
      { message: 'concurrency must be a positive number' }
    );
  });

  test('should throw when concurrency is negative', async () => {
    const items = [1, 2, 3];
    const task = async (n: number) => n;
    
    await assert.rejects(
      () => promisePool({ input: items, iteratorFn: task, concurrency: -5 }),
      { message: 'concurrency must be a positive number' }
    );
  });

  test('should throw when concurrency is not a number', async () => {
    const items = [1, 2, 3];
    const task = async (n: number) => n;
    
    await assert.rejects(
      () => promisePool({ input: items, iteratorFn: task, concurrency: 'not a number' as any }),
      { message: 'concurrency must be a positive number' }
    );
  });

  test('should throw when errorHandler is not a function or undefined', async () => {
    const items = [1, 2, 3];
    const task = async (n: number) => n;
    
    await assert.rejects(
      () => promisePool({ input: items, iteratorFn: task, concurrency: 2, errorHandler: 'not a function' as any }),
      { message: 'errorHandler must be a function' }
    );
  });

  test('should allow undefined errorHandler', async () => {
    const items = [1, 2, 3];
    const task = async (n: number) => n * 2;
    
    const { results } = await promisePool({ input: items, iteratorFn: task, concurrency: 2, errorHandler: undefined });
    assert.strictEqual(results.length, 3);
  });
});

describe('promisePool', () => {
  
  test('should process all items successfully (Happy Path)', async () => {
    const items = [1, 2, 3];
    const task = async (n: number) => n * 2;
    
    const { results, errors } = await promisePool({ input: items, iteratorFn: task, concurrency: 2 });
    
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

    await promisePool({ input: [1, 2, 3, 4, 5], iteratorFn: task, concurrency });
    
    assert.strictEqual(maxParallel, concurrency, `Should not exceed ${concurrency} parallel tasks`);
  });

  test('should handle AsyncIterables (Streams)', async () => {
    async function* asyncGen() {
      yield 'a';
      yield 'b';
    }
    
    const { results } = await promisePool({ input: asyncGen(), iteratorFn: async (s) => s.toUpperCase() });
    assert.deepStrictEqual(results.sort(), ['A', 'B']);
  });

  test('should collect errors and failed items', async () => {
    const items = [1, 'error', 3];
    const task = async (item: any) => {
      if (typeof item === 'string') throw new Error('Boom');
      return item;
    };

    const { results, errors, failedItems } = await promisePool({ input: items, iteratorFn: task });

    assert.strictEqual(results.length, 2);
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].message, 'Boom');
    assert.deepStrictEqual(failedItems, ['error']);
  });

  test('should stop execution when POOL_STOP_SIGNAL is returned', async () => {
    const items = [1, 2, 3];
    let callCount = 0;

    await promisePool({
      input: items,
      iteratorFn: async () => { 
        callCount++; 
        throw new Error('Stop'); 
      },
      concurrency: 1,
      // Asegúrate de que retorne exactamente el símbolo
      errorHandler: () => POOL_STOP_SIGNAL 
    });

    assert.strictEqual(callCount, 1);
  });


  test('should handle empty input', async () => {
    const { results } = await promisePool({ input: [], iteratorFn: async (i) => i });
    assert.deepStrictEqual(results, []);
  });

  test('should support async error handlers', async () => {
    let handlerWaited = false;
    const items = [1];
    
    await promisePool({
      input: items,
      iteratorFn: async () => { throw new Error(); },
      concurrency: 1,
      errorHandler: async () => {
        await new Promise(res => setTimeout(res, 20));
        handlerWaited = true;
      }
    });

    assert.strictEqual(handlerWaited, true);
  });
});
