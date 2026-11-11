type Limiter = {
  /** Runs `task` once fewer than `limit` tasks are running; waiting tasks start in arrival order. */
  run<T>(task: () => Promise<T>): Promise<T>;
};

/**
 * A FIFO concurrency gate. A finishing task hands its slot straight to the next waiter, so the number
 * of running tasks never exceeds `limit`, even between the hand-off and the waiter's first line.
 */
export function createLimiter(limit: number): Limiter {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('A limiter needs a positive whole-number limit.');
  }
  const waiting: (() => void)[] = [];
  let active = 0;
  return {
    async run<T>(task: () => Promise<T>): Promise<T> {
      if (active < limit) {
        active += 1;
      } else {
        await new Promise<void>((resolve) => {
          waiting.push(resolve);
        });
      }
      try {
        return await task();
      } finally {
        const next = waiting.shift();
        if (next === undefined) active -= 1;
        else next();
      }
    },
  };
}
