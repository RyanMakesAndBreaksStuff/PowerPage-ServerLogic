export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

/** A promise the test settles by hand, to hold an async step open while it checks what happens meanwhile. */
export function deferred<T>(): Deferred<T> {
  const holder: Pick<Deferred<T>, 'resolve' | 'reject'> = {
    resolve: () => undefined,
    reject: () => undefined,
  };
  const promise = new Promise<T>((resolve, reject) => {
    holder.resolve = resolve;
    holder.reject = reject;
  });
  return { promise, resolve: holder.resolve, reject: holder.reject };
}
