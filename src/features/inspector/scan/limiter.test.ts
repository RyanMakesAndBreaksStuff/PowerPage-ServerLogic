import { describe, expect, it } from 'vitest';
import { createLimiter } from './limiter';

type Deferred = { promise: Promise<void>; resolve: () => void };

function deferred(): Deferred {
  const holder: { resolve: () => void } = { resolve: () => undefined };
  const promise = new Promise<void>((resolve) => {
    holder.resolve = resolve;
  });
  return { promise, resolve: () => { holder.resolve(); } };
}

describe('createLimiter', () => {
  it('rejects a limit that is not a positive whole number', () => {
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      expect(() => createLimiter(bad)).toThrow(RangeError);
    }
  });

  it('returns each task result', async () => {
    const limiter = createLimiter(2);
    await expect(limiter.run(() => Promise.resolve('a'))).resolves.toBe('a');
  });

  it('never runs more than the limit and starts waiting tasks in arrival order', async () => {
    const limiter = createLimiter(2);
    const gates = [deferred(), deferred(), deferred(), deferred(), deferred()];
    const started: number[] = [];
    const running = { now: 0, peak: 0 };
    const results = gates.map((gate, index) =>
      limiter.run(async () => {
        started.push(index);
        running.now += 1;
        running.peak = Math.max(running.peak, running.now);
        await gate.promise;
        running.now -= 1;
        return index;
      }),
    );
    await Promise.resolve();
    expect(started).toEqual([0, 1]);
    gates[0]?.resolve();
    await expect(results[0]).resolves.toBe(0);
    await Promise.resolve();
    expect(started).toEqual([0, 1, 2]);
    for (const gate of gates) gate.resolve();
    await expect(Promise.all(results)).resolves.toEqual([0, 1, 2, 3, 4]);
    expect(started).toEqual([0, 1, 2, 3, 4]);
    expect(running.peak).toBe(2);
  });

  it('frees the slot when a task rejects', async () => {
    const limiter = createLimiter(1);
    const failing = limiter.run(() => Promise.reject(new Error('boom')));
    const next = limiter.run(() => Promise.resolve('after'));
    await expect(failing).rejects.toThrow('boom');
    await expect(next).resolves.toBe('after');
  });
});
