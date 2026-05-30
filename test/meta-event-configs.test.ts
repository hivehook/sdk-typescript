import { describe, it, expect, afterEach } from "vitest";
import http from "node:http";
import { HivehookClient } from "../src/index.js";

function createMockServer(
  handler: (body: { query: string; variables?: Record<string, unknown> }) => unknown,
): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => {
        const body = JSON.parse(data);
        const result = handler(body);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ data: result }));
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

let opened: http.Server | undefined;
afterEach(() => {
  if (opened) {
    opened.close();
    opened = undefined;
  }
});

describe("MetaEventConfigService", () => {
  it("lists configs", async () => {
    const mock = await createMockServer((body) => {
      expect(body.query).toContain("metaEventConfigs");
      return {
        metaEventConfigs: {
          nodes: [
            { id: "me-1", name: "DLQ alerts", url: "https://hooks.example/alerts", eventTypes: ["delivery.failed"], enabled: true },
          ],
          pageInfo: { total: 1, limit: 50, offset: 0, hasNextPage: false },
        },
      };
    });
    opened = mock.server;
    const client = new HivehookClient({ baseUrl: mock.url, apiKey: "k" });
    const page = await client.metaEventConfigs.list();
    expect(page.nodes).toHaveLength(1);
    expect(page.nodes[0]!.name).toBe("DLQ alerts");
  });

  it("creates a config", async () => {
    const mock = await createMockServer((body) => {
      expect(body.query).toContain("createMetaEventConfig");
      expect(body.variables?.input).toMatchObject({ name: "new", url: "https://new" });
      return {
        createMetaEventConfig: { id: "me-new", name: "new", url: "https://new", eventTypes: ["source.created"], enabled: true },
      };
    });
    opened = mock.server;
    const client = new HivehookClient({ baseUrl: mock.url, apiKey: "k" });
    const c = await client.metaEventConfigs.create({
      name: "new",
      url: "https://new",
      eventTypes: ["source.created"],
    });
    expect(c.id).toBe("me-new");
  });

  it("updates a config", async () => {
    const mock = await createMockServer((body) => {
      expect(body.query).toContain("updateMetaEventConfig");
      expect(body.variables?.id).toBe("me-1");
      return { updateMetaEventConfig: { id: "me-1", name: "renamed" } };
    });
    opened = mock.server;
    const client = new HivehookClient({ baseUrl: mock.url, apiKey: "k" });
    const c = await client.metaEventConfigs.update("me-1", { name: "renamed" });
    expect(c.name).toBe("renamed");
  });

  it("deletes a config", async () => {
    const mock = await createMockServer((body) => {
      expect(body.query).toContain("deleteMetaEventConfig");
      return { deleteMetaEventConfig: true };
    });
    opened = mock.server;
    const client = new HivehookClient({ baseUrl: mock.url, apiKey: "k" });
    expect(await client.metaEventConfigs.delete("me-1")).toBe(true);
  });
});

describe("StreamService.entries", () => {
  it("queries stream entries", async () => {
    const mock = await createMockServer((body) => {
      expect(body.query).toContain("streamEntries");
      expect(body.variables?.streamId).toBe("stream-1");
      return {
        streamEntries: {
          nodes: [
            { id: "se-1", streamId: "stream-1", sequence: 101, eventType: "user.created", payload: "eyJrIjoidiJ9" },
          ],
          pageInfo: { total: 1, limit: 50, offset: 0, hasNextPage: false },
        },
      };
    });
    opened = mock.server;
    const client = new HivehookClient({ baseUrl: mock.url, apiKey: "k" });
    const page = await client.streams.entries("stream-1", { limit: 50 });
    expect(page.nodes[0]!.sequence).toBe(101);
  });
});
