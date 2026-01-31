const sleep = (seconds: number) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

type ErrorHandler<T, E = any> = (error: E, item: T) => void | Promise<void> | typeof POOL_STOP_SIGNAL;

export const POOL_STOP_SIGNAL = Symbol('POOL_STOP_SIGNAL');

export const promisePool = async <T, R>(
  input: Iterable<T> | AsyncIterable<T>,
  iteratorFn: (input: T) => Promise<R>,
  concurrency = 2,
  errorHandler?: ErrorHandler<T>
) => {
  const results: R[] = [];
  const failedItems: T[] = [];
  const errors: Error[] = [];
  let isAborted = false;

  // Convertimos la entrada en un iterador (sea síncrono o asíncrono)
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

const testAray = Array.from({ length: 9 }, (_, i) => i + 1);
const testFn = async (num: number) => {
  await sleep(1);
  if (num === 3) await sleep(3);
  if (num % 3 === 0) {
    throw new Error(`Error on number ${num}`);
  }
  return `Resulted on: < ${num * 2} >`;
};

const timeStart = performance.now();
const { results, errors } = await promisePool(testAray, testFn, 5, (err, item) => {
  if (item === 5){
    return POOL_STOP_SIGNAL;
  }
});
const timeEnd = performance.now();

console.log('Results:', results);
console.log('Errors:', errors);
console.log('Time taken (seconds):', ((timeEnd - timeStart) / 1000).toFixed(2));

export {};
