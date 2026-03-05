interface RetryOptions {
  attempts: number;
  delayMs: number;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<{ value: T; attempts: number }> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      const value = await fn();
      return { value, attempts: attempt };
    } catch (error) {
      lastError = error as Error;
      if (attempt < options.attempts) {
        await wait(options.delayMs);
      }
    }
  }

  throw lastError ?? new Error("Retry attempts exhausted");
}
