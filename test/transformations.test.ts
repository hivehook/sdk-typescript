import { describe, it, expect, afterEach } from "vitest";
import http from "node:http";
import { HivehookClient } from "../src/index.js";

function createMockServer(
  handler: (body: { query: string; variables?: Record<string, unknown> }) => unknown
): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => {
        const body = JSON.parse(data);
        const result = handler(body);

        if (result === null) {
          res.writeHead(401);
          res.end();
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

describe("TransformationService", () => {
  let server: http.Server;
  let client: HivehookClient;

  afterEach(() => {
    server?.close();
  });

  it("lists transformations", async () => {
    const mock = await createMockServer(() => ({
      transformations: {
        nodes: [
          { id: "tf-1", name: "Add Headers", description: "", code: "return event;", enabled: true, failOpen: false, timeoutMs: 1000, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
          { id: "tf-2", name: "Filter Fields", description: "Remove PII", code: "delete event.email; return event;", enabled: true, failOpen: true, timeoutMs: 500, createdAt: "2026-01-02T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z" },
        ],
        pageInfo: { total: 2, limit: 50, offset: 0, hasNextPage: false },
      },
    }));
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url, apiKey: "test-key" });

    const result = await client.transformations.list();
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].name).toBe("Add Headers");
    expect(result.pageInfo.total).toBe(2);
  });

  it("lists transformations with filters", async () => {
    let receivedVars: Record<string, unknown> = {};
    const mock = await createMockServer((body) => {
      receivedVars = body.variables ?? {};
      return {
        transformations: {
          nodes: [],
          pageInfo: { total: 0, limit: 10, offset: 0, hasNextPage: false },
        },
      };
    });
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    await client.transformations.list({ enabled: true, search: "header", first: 10 });
    expect(receivedVars.enabled).toBe(true);
    expect(receivedVars.search).toBe("header");
    expect(receivedVars.first).toBe(10);
  });

  it("gets a transformation", async () => {
    const mock = await createMockServer(() => ({
      transformation: { id: "tf-1", name: "Add Headers", description: "", code: "return event;", enabled: true, failOpen: false, timeoutMs: 1000, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
    }));
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    const tf = await client.transformations.get("tf-1");
    expect(tf?.id).toBe("tf-1");
    expect(tf?.name).toBe("Add Headers");
  });

  it("gets a transformation returns null when not found", async () => {
    const mock = await createMockServer(() => ({
      transformation: null,
    }));
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    const tf = await client.transformations.get("tf-nonexistent");
    expect(tf).toBeNull();
  });

  it("creates a transformation", async () => {
    let receivedVars: Record<string, unknown> = {};
    const mock = await createMockServer((body) => {
      receivedVars = body.variables ?? {};
      return {
        createTransformation: { id: "tf-new", name: "New Transform", description: "desc", code: "return event;", enabled: true, failOpen: false, timeoutMs: 1000, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
      };
    });
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    const tf = await client.transformations.create({ name: "New Transform", code: "return event;", description: "desc" });
    expect(tf.name).toBe("New Transform");
    expect(tf.code).toBe("return event;");
    expect((receivedVars.input as Record<string, unknown>).name).toBe("New Transform");
  });

  it("updates a transformation", async () => {
    let receivedVars: Record<string, unknown> = {};
    const mock = await createMockServer((body) => {
      receivedVars = body.variables ?? {};
      return {
        updateTransformation: { id: "tf-1", name: "Updated", description: "", code: "return event;", enabled: false, failOpen: true, timeoutMs: 2000, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-03T00:00:00Z" },
      };
    });
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    const tf = await client.transformations.update("tf-1", { name: "Updated", enabled: false, failOpen: true, timeoutMs: 2000 });
    expect(tf.name).toBe("Updated");
    expect(tf.enabled).toBe(false);
    expect(tf.failOpen).toBe(true);
    expect(receivedVars.id).toBe("tf-1");
  });

  it("deletes a transformation", async () => {
    const mock = await createMockServer(() => ({ deleteTransformation: true }));
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    const result = await client.transformations.delete("tf-1");
    expect(result).toBe(true);
  });

  it("tests a transformation", async () => {
    let receivedVars: Record<string, unknown> = {};
    const mock = await createMockServer((body) => {
      receivedVars = body.variables ?? {};
      return {
        testTransformation: { success: true, output: { event: "transformed" }, error: null, durationMs: 12 },
      };
    });
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    const result = await client.transformations.test({
      code: "return { event: 'transformed' };",
      payload: { user: "test" },
      eventType: "user.created",
      headers: { "x-custom": "value" },
    });
    expect(result.success).toBe(true);
    expect(result.output).toEqual({ event: "transformed" });
    expect(result.durationMs).toBe(12);
    const input = receivedVars.input as Record<string, unknown>;
    expect(input.code).toBe("return { event: 'transformed' };");
    expect(input.eventType).toBe("user.created");
  });

  it("tests a transformation with failure", async () => {
    const mock = await createMockServer(() => ({
      testTransformation: { success: false, output: null, error: "ReferenceError: x is not defined", durationMs: 3 },
    }));
    server = mock.server;
    client = new HivehookClient({ baseUrl: mock.url });

    const result = await client.transformations.test({
      code: "return x;",
      payload: {},
      eventType: "test",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("ReferenceError: x is not defined");
  });
});
