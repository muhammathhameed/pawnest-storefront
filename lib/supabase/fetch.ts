const SUPABASE_REQUEST_TIMEOUT_MS = 5_000;

export const supabaseFetch: typeof fetch = (input, init) => {
  const timeoutSignal = AbortSignal.timeout(SUPABASE_REQUEST_TIMEOUT_MS);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  return fetch(input, { ...init, signal });
};
