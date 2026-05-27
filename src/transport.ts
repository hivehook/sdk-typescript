import {
  APIError,
  AuthError,
  ConflictError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
} from "./errors.js";

interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: { code?: string };
  }>;
}

export const SDK_VERSION = "0.1.1";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const RETRY_BASE_MS = 50;
const RETRY_FACTOR = 2;
const RETRY_JITTER = 0.25;
const RETRY_MAX_MS = 5_000;

export interface ExecuteOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

function combineSignals(signals: (AbortSignal | undefined)[]): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const handlers: Array<() => void> = [];

  for (const sig of signals) {
    if (!sig) continue;
    if (sig.aborted) {
      controller.abort((sig as AbortSignal & { reason?: unknown }).reason);
      break;
    }
    const handler = () => {
      controller.abort((sig as AbortSignal & { reason?: unknown }).reason);
    };
    sig.addEventListener("abort", handler);
    handlers.push(() => sig.removeEventListener("abort", handler));
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      for (const h of handlers) h();
    },
  };
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }
  return undefined;
}

function computeBackoffMs(attempt: number): number {
  const base = RETRY_BASE_MS * Math.pow(RETRY_FACTOR, attempt);
  const capped = Math.min(base, RETRY_MAX_MS);
  const jitter = capped * RETRY_JITTER * (Math.random() * 2 - 1);
  return Math.max(0, capped + jitter);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(
        (signal as AbortSignal & { reason?: unknown }).reason ??
          new Error("aborted")
      );
      return;
    }
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(
        (signal as AbortSignal & { reason?: unknown }).reason ??
          new Error("aborted")
      );
    };
    signal?.addEventListener("abort", onAbort);
  });
}

export class GraphQLTransport {
  private baseUrl: string;
  private apiKey?: string;
  private fetchFn: typeof fetch;
  private defaultTimeoutMs: number;
  private maxRetries: number;

  constructor(
    baseUrl: string,
    apiKey?: string,
    fetchFn?: typeof fetch,
    options?: { timeoutMs?: number; maxRetries?: number }
  ) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.fetchFn = fetchFn ?? globalThis.fetch;
    this.defaultTimeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  async execute<T>(
    query: string,
    variables?: Record<string, unknown>,
    options?: ExecuteOptions
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": `hivehook-typescript/${SDK_VERSION}`,
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const body = JSON.stringify({ query, variables });
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(
        () => timeoutController.abort(new Error("request timeout")),
        timeoutMs
      );

      const { signal, cleanup } = combineSignals([
        options?.signal,
        timeoutController.signal,
      ]);

      try {
        const result = await this.attempt<T>(body, headers, signal);
        return result;
      } catch (err) {
        lastError = err;
        if (!this.shouldRetry(err) || attempt === this.maxRetries) {
          throw err;
        }
        let delayMs: number;
        if (err instanceof RateLimitError && err.retryAfterMs != null) {
          delayMs = Math.min(err.retryAfterMs, RETRY_MAX_MS);
        } else {
          delayMs = computeBackoffMs(attempt);
        }
        await sleep(delayMs, options?.signal);
      } finally {
        clearTimeout(timeoutId);
        cleanup();
      }
    }
    throw lastError;
  }

  private shouldRetry(err: unknown): boolean {
    if (err instanceof RateLimitError) return true;
    if (err instanceof ServerError) return true;
    if (
      err instanceof AuthError ||
      err instanceof NotFoundError ||
      err instanceof ConflictError ||
      err instanceof ValidationError
    ) {
      return false;
    }
    if (err instanceof APIError) return false;
    // Treat anything else (fetch/network) as retryable.
    return true;
  }

  private async attempt<T>(
    body: string,
    headers: Record<string, string>,
    signal: AbortSignal
  ): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchFn(`${this.baseUrl}/graphql`, {
        method: "POST",
        headers,
        body,
        signal,
      });
    } catch (e) {
      // Network error / abort: rethrow as-is so retry logic can decide.
      throw e;
    }

    if (response.status === 401) {
      const text = await response.text();
      let msg = "unauthorized";
      let gqlErrors: GraphQLResponse["errors"] | undefined;
      if (text) {
        try {
          const json = JSON.parse(text);
          msg = json.errors?.[0]?.message || json.message || msg;
          gqlErrors = json.errors;
        } catch {
          // not JSON; keep default message
        }
      }
      throw new AuthError(msg, 401, gqlErrors);
    }

    if (response.status === 429) {
      const text = await response.text();
      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      let msg = "rate limited";
      let gqlErrors: GraphQLResponse["errors"] | undefined;
      if (text) {
        try {
          const json = JSON.parse(text);
          msg = json.errors?.[0]?.message || json.message || msg;
          gqlErrors = json.errors;
        } catch {
          msg = text || msg;
        }
      }
      throw new RateLimitError(msg, 429, retryAfterMs, gqlErrors);
    }

    if (response.status >= 500) {
      const text = await response.text();
      let msg = `server error: ${response.status}`;
      let gqlErrors: GraphQLResponse["errors"] | undefined;
      if (text) {
        try {
          const json = JSON.parse(text);
          msg = json.errors?.[0]?.message || json.message || msg;
          gqlErrors = json.errors;
        } catch {
          msg = text || msg;
        }
      }
      throw new ServerError(msg, response.status, gqlErrors);
    }

    if (response.status >= 400) {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        const msg = json.errors?.[0]?.message || json.message || text;
        throw new APIError(msg, response.status, json.errors);
      } catch (e) {
        if (e instanceof APIError) throw e;
        throw new APIError(text, response.status);
      }
    }

    const json: GraphQLResponse<T> = await response.json();

    if (json.errors?.length) {
      const err = json.errors[0];
      const code = err.extensions?.code;
      switch (code) {
        case "NOT_FOUND":
          throw new NotFoundError(err.message, json.errors);
        case "CONFLICT":
          throw new ConflictError(err.message, json.errors);
        case "VALIDATION":
          throw new ValidationError(err.message, json.errors);
        default:
          throw new APIError(err.message, undefined, json.errors);
      }
    }

    if (json.data == null) {
      throw new APIError("empty response data", 500);
    }
    return json.data as T;
  }
}
