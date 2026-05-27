import { describe, it, expect, afterEach } from "vitest";
import http from "node:http";
import { HivehookClient, paginate } from "../src/index.js";

interface MockPage {
  nodes: Array<{ id: string }>;
  endCursor?: string;
  hasNextPage: boolean;
}

function pagingServer(pages: Record<string, MockPage>, key = "events"): Promise<{ server: http.Server; url: string; calls: number }> {
  return new Promise((resolve) => {
    const state = { calls: 0 };
    const server = http.createServer((req, res) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => {
        state.calls++;
        const body = JSON.parse(data);
        const after = (body.variables?.after as string | undefined) ?? "";
        const page = pages[after];
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            data: {
              [key]: {
                nodes: page.nodes,
                pageInfo: { total: 0, limit: 0, offset: 0, endCursor: page.endCursor, hasNextPage: page.hasNextPage },
              },
            },
          })
        );
      });
    });
    server.listen(0, () => {
      const addr = server.address() as { port: number };
      resolve({ server, url: `http://localhost:${addr.port}`, get calls() { return state.calls; } } as never);
    });
  });
}

describe("auto-pagination", () => {
  let server: http.Server;
  afterEach(() => server?.close());

  it("iterate() walks every page until hasNextPage is false", async () => {
    const mock = await pagingServer({
      "": { nodes: [{ id: "e1" }, { id: "e2" }], endCursor: "cur1", hasNextPage: true },
      cur1: { nodes: [{ id: "e3" }, { id: "e4" }], endCursor: "cur2", hasNextPage: false },
    });
    server = mock.server;
    const client = new HivehookClient({ baseUrl: mock.url, apiKey: "k" });

    const ids: string[] = [];
    for await (const e of client.events.iterate()) {
      ids.push((e as { id: string }).id);
    }
    expect(ids).toEqual(["e1", "e2", "e3", "e4"]);
  });

  it("stops on a single page with no cursor", async () => {
    const mock = await pagingServer(
      {
        "": { nodes: [{ id: "only" }], hasNextPage: false },
      },
      "sources"
    );
    server = mock.server;
    const client = new HivehookClient({ baseUrl: mock.url, apiKey: "k" });

    const ids: string[] = [];
    for await (const s of client.sources.iterate()) {
      ids.push((s as { id: string }).id);
    }
    expect(ids).toEqual(["only"]);
  });

  it("paginate() helper works against any list function", async () => {
    const mock = await pagingServer({
      "": { nodes: [{ id: "a" }], endCursor: "c1", hasNextPage: true },
      c1: { nodes: [{ id: "b" }], hasNextPage: false },
    });
    server = mock.server;
    const client = new HivehookClient({ baseUrl: mock.url, apiKey: "k" });

    const ids: string[] = [];
    for await (const e of paginate((o) => client.events.list(o))) {
      ids.push((e as { id: string }).id);
    }
    expect(ids).toEqual(["a", "b"]);
  });
});
