import assert from "node:assert";

export const POOL_STOP_SIGNAL = Symbol('POOL_STOP_SIGNAL');

type OnError<T, E = any> = (error: E, item: T) => void | Promise<void> | typeof POOL_STOP_SIGNAL;

const _validateInput = <T, R>(
  input: Iterable<T> | AsyncIterable<T>,
  process: (input: T) => Promise<R>,
  concurrency: number,
  onError?: OnError<T>
): Error | null => {
  if (!input) return new Error('input is required');
  if (typeof process !== 'function') return new Error('process must be a function');
  if (typeof concurrency !== 'number' || concurrency <= 0) return new Error('concurrency must be a positive number');
  if (onError && typeof onError !== 'function') return new Error('onError must be a function');
  
  return null;
};

/**
 * Asynchronously processes an iterable or async iterable of items using a configurable number of concurrent workers.
 * Never throws - all errors are returned in the result object.
 * 
 * @template T - The type of items in the input iterable
 * @template R - The type of results returned by the process function
 * 
 * @param {Object} options - Configuration object for the promise pool
 * @param {Iterable<T> | AsyncIterable<T>} options.input - The data to process. Can be any iterable or async iterable.
 * @param {(item: T) => Promise<R>} options.process - The async function to execute for each item.
 * @param {number} [options.concurrency=2] - Maximum number of items to process concurrently. Must be a positive number.
 * @param {(error: any, item: T) => void | Promise<void> | typeof POOL_STOP_SIGNAL} [options.onError] - Optional callback to handle errors. Return POOL_STOP_SIGNAL to stop the pool immediately.
 * 
 * @returns {Promise<Object>} A promise that resolves with an object containing:
 * @returns {R[]} results - Array of successful results
 * @returns {Error[]} errors - Array of all errors encountered (both validation and processing)
 * @returns {T[]} failedItems - Array of items that failed to process
 * @returns {boolean} stoppedPrematurely - Whether the pool was stopped early via POOL_STOP_SIGNAL
 * 
 * @example
 * const { results, errors } = await promisePool({
 *   input: [1, 2, 3, 4, 5],
 *   process: async (id) => fetchData(id),
 *   concurrency: 3
 * });
 * 
 * @example
 * const { results, errors, stoppedPrematurely } = await promisePool({
 *   input: largeDataset,
 *   process: processItem,
 *   concurrency: 5,
 *   onError: async (error, item) => {
 *     if (error.code === 'AUTH_ERROR') {
 *       return POOL_STOP_SIGNAL; // Stop immediately on auth errors
 *     }
 *     console.warn(`Failed to process item ${item.id}`);
 *   }
 * });
 */
export const promisePool = async <T, R>({
  input,
  process,
  concurrency = 2,
  onError,
}: {
  input: Iterable<T> | AsyncIterable<T>;
  process: (input: T) => Promise<R>;
  concurrency?: number;
  onError?: OnError<T>;
}) => {
  const results: R[] = [];
  const failedItems: T[] = [];
  const errors: Error[] = [];
  let isAborted = false;

  // Validate input
  const validationError = _validateInput(input, process, concurrency, onError);
  if (validationError) {
    errors.push(validationError);
    return { results, errors, failedItems, stoppedPrematurely: isAborted };
  }

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
        const res = await process(item);
        if (!isAborted) results.push(res);
      } catch (err) {
        errors.push(err as Error);
        failedItems.push(item);
        if (onError) {
          const action = await onError(err, item);
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
