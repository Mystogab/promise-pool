import assert from "node:assert";

export const POOL_STOP_SIGNAL = Symbol('POOL_STOP_SIGNAL');

type ErrorHandler<T, E = any> = (error: E, item: T) => void | Promise<void> | typeof POOL_STOP_SIGNAL;

const _validateInput = <T, R>(
  input: Iterable<T> | AsyncIterable<T>,
  iteratorFn: (input: T) => Promise<R>,
  concurrency: number,
  errorHandler?: ErrorHandler<T>
) => {
  assert(input, 'input is required');
  assert(typeof iteratorFn === 'function', 'iteratorFn must be a function');
  assert(typeof concurrency === 'number' && concurrency > 0, 'concurrency must be a positive number');
  assert(!errorHandler || typeof errorHandler === 'function', 'errorHandler must be a function');
};


export const promisePool = async <T, R>(
  input: Iterable<T> | AsyncIterable<T>,
  iteratorFn: (input: T) => Promise<R>,
  concurrency = 2,
  errorHandler?: ErrorHandler<T>
) => {
  _validateInput(input, iteratorFn, concurrency, errorHandler);
  const results: R[] = [];
  const failedItems: T[] = [];
  const errors: Error[] = [];
  let isAborted = false;

  // Convert to an iterator (sync or async)
  const iterable = (input as any)[Symbol.asyncIterator] 
    ? (input as AsyncIterable<T>)[Symbol.asyncIterator]()
    : (input as Iterable<T>)[Symbol.iterator]();

  const worker = async () => {
    while (!isAborted) {
      const { value, done } = await iterable.next();
      
      if (done || isAborted) break;
      const item = value;

      try {
        const res = await iteratorFn(item);
        if (!isAborted) results.push(res);
      } catch (err) {
        errors.push(err as Error);
        failedItems.push(item);
        if (errorHandler) {
          const action = await errorHandler(err, item);
          if (action === POOL_STOP_SIGNAL) isAborted = true;
        }
      }
    }
  };

  // Lunch workers up to the concurrency limit
  const workers = Array.from({ length: concurrency }, worker);
  await Promise.all(workers);

  return { results, errors, failedItems, stoppedPrematurely: isAborted };
};
