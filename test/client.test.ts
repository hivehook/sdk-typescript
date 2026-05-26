import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "node:http";
import {
  HivehookClient,
  AuthError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  ServerError,
} from "../src/index.js";

interface GraphQLErrorShape {
  message: string;
  extensions?: { code?: string };
}

function createMockServer(
  handler: (body: {
    query: string;
    variables?: Record<string, unknown>;
  }) =>
    | unknown
    | { __errors: GraphQLErrorShape[]; __status?: number }
): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => {
        const body = JSON.parse(data);
        const result = handler(body) as
          | null
          | { __errors: GraphQLErrorShape[]; __status?: number }
          | Record<string, unknown>;

        if (result === null) {
          res.writeHead(401);
          res.end();
          return;
        }

        if (
          result &&
          typeof result === "object" &&
          "__errors" in (result as Record<string, unknown>)
        ) {
          const r = result as {
            __errors: GraphQLErrorShape[];
            __status?: number;
          };
          res.writeHead(r.__status ?? 200, {
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ errors: r.__errors }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ data: result }));
      });
    });
    server.listen(0, () => {
      const addr = server.address() as { port: number };
      resolve({ server, url: `http://localhost:${addr.port}` });
    });
  });
}

function utf8ToBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

describe("HivehookClient", () => {
  let server: http.Server;
  let client: HivehookClient;

  afterEach(() => {
    server?.close();
  });

  it("lists sources", async () => {
    const mock = await createMockServer(() => ({
      sources: {
        nodes: [
          { id: "src-1", name: "GitHub", slug: "github", providerType: "github", status: "ACTIVE" },
          { id: "src-2", name: "Stripe", slug: "stripe", providerType: "stripe", status: "ACTIVE" },
        ],
        pageInfo: { total: 2, limit: 50, offset: 0, hasNextPage: false },
      },
    }));
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url, apiKey: "test-key" });

    const result = await client.sources.list();
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].name).toBe("GitHub");
    expect(result.pageInfo.total).toBe(2);
  });

  it("gets a source", async () => {
    const mock = await createMockServer(() => ({
      source: { id: "src-1", name: "GitHub", slug: "github", providerType: "github", status: "ACTIVE" },
    }));
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    const source = await client.sources.get("src-1");
    expect(source?.id).toBe("src-1");
    expect(source?.name).toBe("GitHub");
  });

  it("creates a source", async () => {
    const mock = await createMockServer(() => ({
      createSource: { id: "src-new", name: "New", slug: "new", providerType: "github", status: "ACTIVE" },
    }));
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    const source = await client.sources.create({ name: "New", slug: "new", providerType: "github" });
    expect(source.name).toBe("New");
  });

  it("deletes a source", async () => {
    const mock = await createMockServer(() => ({ deleteSource: true }));
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    const result = await client.sources.delete("src-1");
    expect(result).toBe(true);
  });

  it("sends a message (base64-encodes payload on the wire)", async () => {
    const rawPayload = '{"user":"test"}';
    let observedPayload: unknown = undefined;
    const mock = await createMockServer((body) => {
      const input = (body.variables as { input: { payload: string } }).input;
      observedPayload = input.payload;
      return {
        sendMessage: {
          id: "msg-1",
          applicationId: "app-1",
          eventType: "user.created",
          status: "PENDING",
        },
      };
    });
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    const msg = await client.messages.send({
      applicationId: "app-1",
      eventType: "user.created",
      payload: rawPayload,
    });
    expect(msg.eventType).toBe("user.created");
    expect(observedPayload).toBe(utf8ToBase64(rawPayload));
    // Sanity check: it must not be the double-encoded form.
    expect(observedPayload).not.toBe(utf8ToBase64(utf8ToBase64(rawPayload)));
  });

  it("encodes Unicode payloads safely (UTF-8 before base64)", async () => {
    const rawPayload = "héllo 世界";
    let observedPayload: unknown = undefined;
    const mock = await createMockServer((body) => {
      const input = (body.variables as { input: { payload: string } }).input;
      observedPayload = input.payload;
      return {
        sendMessage: {
          id: "msg-2",
          applicationId: "app-1",
          eventType: "user.created",
          status: "PENDING",
        },
      };
    });
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    await client.messages.send({
      applicationId: "app-1",
      eventType: "user.created",
      payload: rawPayload,
    });
    expect(observedPayload).toBe(utf8ToBase64(rawPayload));
    // Equivalent classic form: btoa(unescape(encodeURIComponent(...))).
    expect(observedPayload).toBe(
      btoa(unescape(encodeURIComponent(rawPayload)))
    );
  });

  it("gets system status", async () => {
    const mock = await createMockServer(() => ({
      status: { status: "ok", version: "v0.1.0-beta", uptime: 3600, queueDepth: 0 },
    }));
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    const status = await client.status.get();
    expect(status.status).toBe("ok");
    expect(status.version).toBe("v0.1.0-beta");
  });

  it("replays all DLQ", async () => {
    const mock = await createMockServer(() => ({
      replayAllDLQ: { deliveries: 5 },
    }));
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    const result = await client.dlq.replayAll();
    expect(result.deliveries).toBe(5);
  });

  it("handles 401 unauthorized", async () => {
    const mock = await createMockServer(() => null);
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    await expect(client.sources.get("src-1")).rejects.toThrow(AuthError);
  });

  it("sends authorization header", async () => {
    let receivedAuth = "";
    const mock = await createMockServer(function (this: void) {
      return { source: null };
    });

    const origHandler = (mock.server as any)._events.request;
    (mock.server as any)._events.request = (req: http.IncomingMessage, res: http.ServerResponse) => {
      receivedAuth = req.headers.authorization ?? "";
      origHandler(req, res);
    };

    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url, apiKey: "htk_test123" });

    await client.sources.get("src-1");
    expect(receivedAuth).toBe("Bearer htk_test123");
  });

  it("creates an application", async () => {
    const mock = await createMockServer(() => ({
      createApplication: { id: "app-1", name: "Test App", uid: "test-app" },
    }));
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    const app = await client.applications.create({ name: "Test App" });
    expect(app.name).toBe("Test App");
  });

  it("dispatches NOT_FOUND GraphQL errors to NotFoundError", async () => {
    const mock = await createMockServer(() => ({
      __errors: [
        {
          message: "source not found",
          extensions: { code: "NOT_FOUND" },
        },
      ],
    }));
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    await expect(client.sources.get("missing")).rejects.toMatchObject({
      name: "NotFoundError",
      message: "source not found",
    });
  });

  it("dispatches CONFLICT GraphQL errors to ConflictError", async () => {
    const mock = await createMockServer(() => ({
      __errors: [
        {
          message: "slug already exists",
          extensions: { code: "CONFLICT" },
        },
      ],
    }));
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    await expect(
      client.sources.create({ name: "X", slug: "x", providerType: "github" })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("dispatches VALIDATION GraphQL errors to ValidationError", async () => {
    const mock = await createMockServer(() => ({
      __errors: [
        {
          message: "slug is required",
          extensions: { code: "VALIDATION" },
        },
      ],
    }));
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    await expect(
      client.sources.create({ name: "X", slug: "", providerType: "github" })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("attaches the full graphqlErrors array (preserves errors past index 0)", async () => {
    const mock = await createMockServer(() => ({
      __errors: [
        { message: "slug is required", extensions: { code: "VALIDATION" } },
        { message: "name is required", extensions: { code: "VALIDATION" } },
      ],
    }));
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    try {
      await client.sources.create({
        name: "",
        slug: "",
        providerType: "github",
      });
      throw new Error("expected ValidationError");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      const err = e as ValidationError;
      expect(err.graphqlErrors).toBeDefined();
      expect(err.graphqlErrors).toHaveLength(2);
      expect(err.graphqlErrors?.[1].message).toBe("name is required");
    }
  });

  it("reads server-provided 401 message instead of hardcoding 'unauthorized'", async () => {
    const server401 = http.createServer((req, res) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            errors: [
              {
                message: "api key expired",
                extensions: { code: "UNAUTHENTICATED" },
              },
            ],
          })
        );
      });
    });
    await new Promise<void>((resolve) => server401.listen(0, resolve));
    server = server401;
    const addr = server401.address() as { port: number };
    client = new HivehookClient({ baseUrl: `http://localhost:${addr.port}` });

    try {
      await client.sources.get("src-1");
      throw new Error("expected AuthError");
    } catch (e) {
      expect(e).toBeInstanceOf(AuthError);
      const err = e as AuthError;
      expect(err.message).toBe("api key expired");
      expect(err.statusCode).toBe(401);
      expect(err.graphqlErrors?.[0].message).toBe("api key expired");
    }
  });

  it("falls back to 'unauthorized' on 401 with empty body", async () => {
    const mock = await createMockServer(() => null);
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    try {
      await client.sources.get("src-1");
      throw new Error("expected AuthError");
    } catch (e) {
      expect(e).toBeInstanceOf(AuthError);
      expect((e as AuthError).message).toBe("unauthorized");
    }
  });

  it("dispatches HTTP 429 to RateLimitError with parsed Retry-After (seconds)", async () => {
    const rlServer = http.createServer((req, res) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => {
        res.writeHead(429, {
          "Content-Type": "application/json",
          "Retry-After": "2",
        });
        res.end(
          JSON.stringify({
            errors: [
              { message: "too many requests", extensions: { code: "RATE_LIMITED" } },
            ],
          })
        );
      });
    });
    await new Promise<void>((resolve) => rlServer.listen(0, resolve));
    server = rlServer;
    const addr = rlServer.address() as { port: number };
    // maxRetries: 0 to assert dispatch without retry storm.
    client = new HivehookClient({
      baseUrl: `http://localhost:${addr.port}`,
      maxRetries: 0,
    });

    try {
      await client.sources.get("src-1");
      throw new Error("expected RateLimitError");
    } catch (e) {
      expect(e).toBeInstanceOf(RateLimitError);
      const err = e as RateLimitError;
      expect(err.statusCode).toBe(429);
      expect(err.retryAfterMs).toBe(2000);
      expect(err.message).toBe("too many requests");
    }
  });

  it("dispatches HTTP 5xx to ServerError", async () => {
    const sServer = http.createServer((req, res) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ errors: [{ message: "upstream down" }] }));
      });
    });
    await new Promise<void>((resolve) => sServer.listen(0, resolve));
    server = sServer;
    const addr = sServer.address() as { port: number };
    client = new HivehookClient({
      baseUrl: `http://localhost:${addr.port}`,
      maxRetries: 0,
    });

    try {
      await client.sources.get("src-1");
      throw new Error("expected ServerError");
    } catch (e) {
      expect(e).toBeInstanceOf(ServerError);
      expect((e as ServerError).statusCode).toBe(503);
      expect((e as ServerError).message).toBe("upstream down");
    }
  });

  it("retries on 5xx and eventually succeeds", async () => {
    let attempts = 0;
    const retryServer = http.createServer((req, res) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => {
        attempts++;
        if (attempts < 3) {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ errors: [{ message: "try again" }] }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            data: {
              source: {
                id: "src-1",
                name: "GitHub",
                slug: "github",
                providerType: "github",
                status: "ACTIVE",
              },
            },
          })
        );
      });
    });
    await new Promise<void>((resolve) => retryServer.listen(0, resolve));
    server = retryServer;
    const addr = retryServer.address() as { port: number };
    client = new HivehookClient({
      baseUrl: `http://localhost:${addr.port}`,
      maxRetries: 3,
    });

    const source = await client.sources.get("src-1");
    expect(attempts).toBe(3);
    expect(source?.id).toBe("src-1");
  });

  it("gives up after maxRetries on persistent 5xx", async () => {
    let attempts = 0;
    const failServer = http.createServer((req, res) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => {
        attempts++;
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ errors: [{ message: "boom" }] }));
      });
    });
    await new Promise<void>((resolve) => failServer.listen(0, resolve));
    server = failServer;
    const addr = failServer.address() as { port: number };
    client = new HivehookClient({
      baseUrl: `http://localhost:${addr.port}`,
      maxRetries: 2,
    });

    await expect(client.sources.get("src-1")).rejects.toBeInstanceOf(
      ServerError
    );
    // 1 initial + 2 retries
    expect(attempts).toBe(3);
  });

  it("does NOT retry auth/validation/notfound errors", async () => {
    let attempts = 0;
    const authServer = http.createServer((req, res) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => {
        attempts++;
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ errors: [{ message: "nope" }] }));
      });
    });
    await new Promise<void>((resolve) => authServer.listen(0, resolve));
    server = authServer;
    const addr = authServer.address() as { port: number };
    client = new HivehookClient({
      baseUrl: `http://localhost:${addr.port}`,
      maxRetries: 5,
    });

    await expect(client.sources.get("src-1")).rejects.toBeInstanceOf(AuthError);
    expect(attempts).toBe(1);
  });

  it("honors Retry-After header timing on 429 retry", async () => {
    let attempts = 0;
    let firstAttemptAt = 0;
    let secondAttemptAt = 0;
    const rlServer = http.createServer((req, res) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => {
        attempts++;
        if (attempts === 1) {
          firstAttemptAt = Date.now();
          res.writeHead(429, {
            "Content-Type": "application/json",
            "Retry-After": "1",
          });
          res.end(JSON.stringify({ errors: [{ message: "slow down" }] }));
          return;
        }
        secondAttemptAt = Date.now();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            data: {
              source: {
                id: "src-1",
                name: "GitHub",
                slug: "github",
                providerType: "github",
                status: "ACTIVE",
              },
            },
          })
        );
      });
    });
    await new Promise<void>((resolve) => rlServer.listen(0, resolve));
    server = rlServer;
    const addr = rlServer.address() as { port: number };
    client = new HivehookClient({
      baseUrl: `http://localhost:${addr.port}`,
      maxRetries: 1,
    });

    const result = await client.sources.get("src-1");
    expect(result?.id).toBe("src-1");
    expect(attempts).toBe(2);
    const elapsed = secondAttemptAt - firstAttemptAt;
    // Should wait ~1000ms (Retry-After: 1). Allow generous lower bound for clock skew.
    expect(elapsed).toBeGreaterThanOrEqual(900);
    // And should not exceed Retry-After plus a comfortable buffer.
    expect(elapsed).toBeLessThan(3000);
  }, 10_000);

  it("cancels in-flight requests via AbortSignal", async () => {
    // Server that never responds.
    const hangServer = http.createServer((_req, _res) => {
      // intentionally hang
    });
    await new Promise<void>((resolve) => hangServer.listen(0, resolve));
    server = hangServer;
    const addr = hangServer.address() as { port: number };
    client = new HivehookClient({
      baseUrl: `http://localhost:${addr.port}`,
      maxRetries: 0,
    });

    const controller = new AbortController();
    setTimeout(() => controller.abort(new Error("user cancelled")), 50);

    await expect(
      client.sources.list({}, { signal: controller.signal })
    ).rejects.toThrow();
  }, 5_000);

  it("times out via per-call timeoutMs", async () => {
    const hangServer = http.createServer((_req, _res) => {
      // intentionally hang
    });
    await new Promise<void>((resolve) => hangServer.listen(0, resolve));
    server = hangServer;
    const addr = hangServer.address() as { port: number };
    client = new HivehookClient({
      baseUrl: `http://localhost:${addr.port}`,
      maxRetries: 0,
    });

    await expect(
      client.sources.list({}, { timeoutMs: 100 })
    ).rejects.toThrow();
  }, 5_000);
});
