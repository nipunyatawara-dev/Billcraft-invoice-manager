const lockQueues = new Map<string, Promise<void>>();

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = lockQueues.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  lockQueues.set(key, previous.then(() => current));
  await previous;

  try {
    return await fn();
  } finally {
    release();
    if (lockQueues.get(key) === current) {
      lockQueues.delete(key);
    }
  }
}

export const USER_DATA_LOCK_KEY = "user-data";

export function withUserDataLock<T>(fn: () => Promise<T>): Promise<T> {
  return withLock(USER_DATA_LOCK_KEY, fn);
}
