import type { DLQEntry, ReplayResult, PurgeResult, PageInfo, ListOptions } from "../types.js";
import type { GraphQLTransport } from "../transport.js";
import { paginate } from "../pagination.js";

export interface ListDLQOptions extends ListOptions {
  eventId?: string;
  replayed?: boolean;
}

const DLQ_FRAGMENT = `
  id
  deliveryId
  eventId
  lastError
  replayedAt
  createdAt
`;

const LIST_QUERY = `
  query ListDLQEntries($eventId: UUID, $replayed: Boolean, $search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    dlqEntries(eventId: $eventId, replayed: $replayed, search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${DLQ_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const REPLAY_MUTATION = `
  mutation ReplayDLQEntry($id: UUID!) {
    replayDLQEntry(id: $id)
  }
`;

const REPLAY_ALL_MUTATION = `
  mutation ReplayAllDLQ {
    replayAllDLQ { deliveries }
  }
`;

const PURGE_MUTATION = `
  mutation PurgeDLQ($olderThan: String!) {
    purgeDLQ(olderThan: $olderThan) { purged }
  }
`;

export class DLQService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListDLQOptions): Promise<{ nodes: DLQEntry[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
      if (options.eventId !== undefined) variables.eventId = options.eventId;
      if (options.replayed !== undefined) variables.replayed = options.replayed;
    }
    const data = await this.transport.execute<{ dlqEntries: { nodes: DLQEntry[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.dlqEntries;
  }

  async replay(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ replayDLQEntry: boolean }>(REPLAY_MUTATION, { id });
    return data.replayDLQEntry;
  }

  async replayAll(): Promise<ReplayResult> {
    const data = await this.transport.execute<{ replayAllDLQ: ReplayResult }>(REPLAY_ALL_MUTATION);
    return data.replayAllDLQ;
  }

  async purge(olderThan?: string): Promise<PurgeResult> {
    const data = await this.transport.execute<{ purgeDLQ: PurgeResult }>(PURGE_MUTATION, { olderThan: olderThan ?? "168h" });
    return data.purgeDLQ;
  }

  iterate(options?: ListDLQOptions): AsyncGenerator<DLQEntry, void, unknown> {
    return paginate((o) => this.list(o), options);
  }
}
