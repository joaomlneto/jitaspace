/**
 * Runs many ESI requests with bounded concurrency while staying inside ESI's
 * limits, for jobs that make thousands of calls per run.
 *
 * - **Error limit** (`X-ESI-Error-Limit-Remain` / `-Reset`): every 4xx/5xx
 *   counts against a budget per IP that refills each window. When the remaining
 *   budget falls to `errorFloor`, every request waits for the window to reset;
 *   a 420 (budget exhausted) waits too, and is retried.
 * - **429** (rate limited): waits `Retry-After` seconds, then retries.
 * - **5xx, timeouts, dropped connections**: retried with exponential backoff, up
 *   to `maxAttempts`, then reported as transient so the caller can try again on
 *   its next run.
 * - **Other 4xx** (400, 403, 404): returned at once, never retried. Asking
 *   again gets the same answer and costs another error.
 *
 * `@jitaspace/esi-client` already honours `X-Ratelimit-*` for the route groups
 * its spec declares; the public-contract and dynamic-item routes declare none
 * and send no such headers (checked 2026-11-03).
 */
type HeaderBag = Record<string, unknown>;

interface EsiResponse<T> {
  data: T;
  status: number;
  headers: HeaderBag;
}

export type EsiOutcome<T> =
  | { ok: true; status: number; data: T; headers: HeaderBag }
  | {
      ok: false;
      /** HTTP status, or null when no response arrived. */
      status: number | null;
      /** True if retrying later might succeed (420, 429, 5xx, no response). */
      transient: boolean;
      error: unknown;
    };

export interface EsiGateOptions {
  concurrency: number;
  /** Pause everything once this few errors remain in the window. */
  errorFloor?: number;
  /** Attempts for transient failures, the first included. */
  maxAttempts?: number;
  /** Per-attempt timeout. */
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface EsiGateStats {
  requests: number;
  retries: number;
  errorPauses: number;
  /** Responses by HTTP status (`"none"` when no response arrived). */
  statuses: Record<string, number>;
}

const header = (headers: HeaderBag | undefined, name: string) => {
  if (!headers) return undefined;
  const value: unknown =
    typeof (headers as { get?: unknown }).get === "function"
      ? (headers as { get: (n: string) => unknown }).get(name)
      : (headers[name] ??
        Object.entries(headers).find(
          ([k]) => k.toLowerCase() === name.toLowerCase(),
        )?.[1]);
  const n = Number(Array.isArray(value) ? value[0] : value);
  return value == null || value === "" || !Number.isFinite(n) ? undefined : n;
};

/** At most `concurrency` calls in flight; the rest wait their turn in order. */
const createLimiter = (concurrency: number) => {
  let active = 0;
  const queue: (() => void)[] = [];
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (active < concurrency) active++;
    // Full: wait for a finishing call to hand its slot over.
    else await new Promise<void>((resolve) => queue.push(resolve));
    try {
      return await fn();
    } finally {
      const next = queue.shift();
      if (next) next();
      else active--;
    }
  };
};

const responseOf = (error: unknown) =>
  (error as { response?: { status?: number; headers?: HeaderBag } } | null)
    ?.response;

export const createEsiGate = ({
  concurrency,
  errorFloor = 20,
  maxAttempts = 4,
  timeoutMs = 30_000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = Date.now,
}: EsiGateOptions) => {
  const limit = createLimiter(concurrency);
  let pausedUntil = 0;
  const stats: EsiGateStats = {
    requests: 0,
    retries: 0,
    errorPauses: 0,
    statuses: {},
  };

  const pauseFor = (ms: number) => {
    const until = now() + ms;
    if (until > pausedUntil) {
      pausedUntil = until;
      stats.errorPauses++;
    }
  };

  /** Pause until the error window resets once the budget runs low. */
  const observeErrorLimit = (headers: HeaderBag | undefined) => {
    const remain = header(headers, "x-esi-error-limit-remain");
    const reset = header(headers, "x-esi-error-limit-reset");
    if (remain !== undefined && remain <= errorFloor) {
      pauseFor(((reset ?? 60) + 1) * 1000);
    }
  };

  const waitIfPaused = async () => {
    for (let wait = pausedUntil - now(); wait > 0; wait = pausedUntil - now()) {
      await sleep(wait);
    }
  };

  const attempt = async <T>(
    call: (signal: AbortSignal) => Promise<EsiResponse<T>>,
  ): Promise<EsiOutcome<T>> => {
    for (let n = 1; ; n++) {
      await waitIfPaused();
      stats.requests++;
      try {
        const res = await call(AbortSignal.timeout(timeoutMs));
        stats.statuses[res.status] = (stats.statuses[res.status] ?? 0) + 1;
        observeErrorLimit(res.headers);
        return {
          ok: true,
          status: res.status,
          data: res.data,
          headers: res.headers,
        };
      } catch (error) {
        const res = responseOf(error);
        const status = res?.status ?? null;
        stats.statuses[status ?? "none"] =
          (stats.statuses[status ?? "none"] ?? 0) + 1;
        observeErrorLimit(res?.headers);
        const transient =
          status === null || status >= 500 || status === 420 || status === 429;
        if (!transient || n >= maxAttempts) {
          return { ok: false, status, transient, error };
        }
        stats.retries++;
        if (status === 420) {
          pauseFor(
            ((header(res?.headers, "x-esi-error-limit-reset") ?? 60) + 1) *
              1000,
          );
        } else if (status === 429) {
          pauseFor((header(res?.headers, "retry-after") ?? 60) * 1000);
        } else {
          await sleep(Math.min(30_000, 1000 * 2 ** n));
        }
      }
    }
  };

  return {
    /** Run one ESI call through the gate. Never throws for HTTP failures. */
    request: <T>(call: (signal: AbortSignal) => Promise<EsiResponse<T>>) =>
      limit(() => attempt(call)),
    stats,
  };
};

export type EsiGate = ReturnType<typeof createEsiGate>;

/** ESI's X-Pages header: 1 when absent. */
export const pagesOf = (headers: HeaderBag) => header(headers, "x-pages") ?? 1;

/** Epoch ms of a Last-Modified header, or undefined. */
export const lastModifiedOf = (headers: HeaderBag) => {
  const raw: unknown =
    typeof (headers as { get?: unknown }).get === "function"
      ? (headers as { get: (n: string) => unknown }).get("last-modified")
      : (headers["last-modified"] ?? headers["Last-Modified"]);
  const ms = typeof raw === "string" ? Date.parse(raw) : Number.NaN;
  return Number.isFinite(ms) ? ms : undefined;
};
