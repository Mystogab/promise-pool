import assert, { fail } from "node:assert";

export const POOL_STOP_SIGNAL = Symbol('POOL_STOP_SIGNAL');
export const TIMEOUT_SIGNAL = Symbol('timeout');

type OnError<T, E = any> = (error: E, item: T) => void | Promise<void> | typeof POOL_STOP_SIGNAL | typeof TIMEOUT_SIGNAL | Error | Promise<Error>;
type OnTaskStarted<T> = (item: T, index: number) => void | Promise<void>;
type OnTaskFinished<T, R> = (item: T, index: number, result: R) => void | Promise<void>;

const _validateInput = <T, R>(
  input: Iterable<T> | AsyncIterable<T>,
  process: (input: T) => Promise<R>,
  concurrency: number,
  onError?: OnError<T>,
  onTaskStarted?: OnTaskStarted<T>,
  onTaskFinished?: OnTaskFinished<T, R>
): Error | null => {
  if (!input) return new Error('input is required');
  if (typeof process !== 'function') return new Error('process must be a function');
  if (typeof concurrency !== 'number' || concurrency <= 0) return new Error('concurrency must be a positive number');
  if (onError && typeof onError !== 'function') return new Error('onError must be a function');
  if (onTaskStarted && typeof onTaskStarted !== 'function') return new Error('onTaskStarted must be a function');
  if (onTaskFinished && typeof onTaskFinished !== 'function') return new Error('onTaskFinished must be a function');
  
  return null;
};

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(TIMEOUT_SIGNAL), ms);
  });

  return Promise.race([promise, timeoutPromise]);
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
 * @param {(item: T, index: number) => void | Promise<void>} [options.onTaskStarted] - Optional callback to execute when a task starts processing.
 * @param {(item: T, index: number, result: R) => void | Promise<void>} [options.onTaskFinished] - Optional callback to execute when a task finishes processing.
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
 * 
 * @example
 * const { results } = await promisePool({
 *   input: [1, 2, 3, 4, 5],
 *   process: async (id) => fetchData(id),
 *   concurrency: 3,
 *   onTaskStarted: (item, index) => {
 *     console.log(`Starting task ${index}: ${item}`);
 *   },
 *   onTaskFinished: (item, index, result) => {
 *     console.log(`Finished task ${index}: ${item} with result ${result}`);
 *   }
 * });
 */
export const promisePool = async <T, R>({
  input,
  process,
  concurrency = 2,
  onError,
  onTaskStarted,
  onTaskFinished,
  timeout
}: {
  input: Iterable<T> | AsyncIterable<T>;
  process: (input: T) => Promise<R>;
  concurrency?: number;
  onError?: OnError<T>;
  onTaskStarted?: OnTaskStarted<T>;
  onTaskFinished?: OnTaskFinished<T, R>;
  timeout?: number;
}) => {
  const results: R[] = [];
  const failedItems: T[] = [];
  const errors: Error[] = [];
  let isAborted = false;
  let index = 0;

  // Validate input
  const validationError = _validateInput(input, process, concurrency, onError, onTaskStarted, onTaskFinished);
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
        // Call onTaskStarted callback if provided
        if (onTaskStarted) {
          await onTaskStarted(item, index);
        }
        
        const res = await (timeout ? withTimeout(process(item), timeout) : process(item));
        
        // Call onTaskFinished callback if provided
        if (onTaskFinished) {
          await onTaskFinished(item, index, res);
        }
        
        if (!isAborted) results.push(res);
        index++;
      } catch (err) {

        if (!onError) {
          errors.push(err as Error);
          failedItems.push(item);
          index++;
          continue;
        }

        try {
          const errHandlerResult = await onError(err, item);
          if (errHandlerResult === POOL_STOP_SIGNAL) {
            isAborted = true;
            errors.push(err as Error);
            failedItems.push(item);
            index++;
            continue;
          }
          if (errHandlerResult instanceof Error) {
            errors.push(errHandlerResult);
            failedItems.push(item);
            index++;
            continue;
          }
          errors.push(err as Error);
          failedItems.push(item);
          index++;
        } catch (errorHandlerErr) {
          isAborted = true;
          errors.push(errorHandlerErr as Error);
          failedItems.push(item);
          index++;
        }
      }
    }
  };

  // Launch workers up to the concurrency limit
  const workers = Array.from({ length: concurrency }, worker);
  await Promise.all(workers);

  return { results, errors, failedItems, stoppedPrematurely: isAborted };
};
