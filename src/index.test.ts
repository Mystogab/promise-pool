import { test, describe } from 'node:test';
import assert from 'node:assert';
import { promisePool, POOL_STOP_SIGNAL } from './index.ts';

describe('promisePool', () => {
  
  test('should process all items successfully (Happy Path)', async () => {
    const items = [1, 2, 3];
    const task = async (n: number) => n * 2;
    
    const { results, errors } = await promisePool(items, task, 2);
    
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

    await promisePool([1, 2, 3, 4, 5], task, concurrency);
    
    assert.strictEqual(maxParallel, concurrency, `Should not exceed ${concurrency} parallel tasks`);
  });

  test('should handle AsyncIterables (Streams)', async () => {
    async function* asyncGen() {
      yield 'a';
      yield 'b';
    }
    
    const { results } = await promisePool(asyncGen(), async (s) => s.toUpperCase());
    assert.deepStrictEqual(results.sort(), ['A', 'B']);
  });

  test('should collect errors and failed items', async () => {
    const items = [1, 'error', 3];
    const task = async (item: any) => {
      if (typeof item === 'string') throw new Error('Boom');
      return item;
    };

    const { results, errors, failedItems } = await promisePool(items, task);

    assert.strictEqual(results.length, 2);
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].message, 'Boom');
    assert.deepStrictEqual(failedItems, ['error']);
  });

  test('should stop execution when POOL_STOP_SIGNAL is returned', async () => {
    const items = [1, 2, 3];
    let callCount = 0;

    await promisePool(
      items,
      async () => { 
        callCount++; 
        throw new Error('Stop'); 
      },
      1,
      // Asegúrate de que retorne exactamente el símbolo
      () => POOL_STOP_SIGNAL 
    );

    assert.strictEqual(callCount, 1);
  });


  test('should handle empty input', async () => {
    const { results } = await promisePool([], async (i) => i);
    assert.deepStrictEqual(results, []);
  });

  test('should support async error handlers', async () => {
    let handlerWaited = false;
    const items = [1];
    
    await promisePool(
      items,
      async () => { throw new Error(); },
      1,
      async () => {
        await new Promise(res => setTimeout(res, 20));
        handlerWaited = true;
      }
    );

    assert.strictEqual(handlerWaited, true);
  });
});
