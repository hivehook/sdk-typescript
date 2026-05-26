import type { OutboundDLQEntry, ReplayResult, PurgeResult, PageInfo, ListOptions } from "../types.js";
import type { GraphQLTransport } from "../transport.js";

export interface ListOutboundDLQOptions extends ListOptions {
  messageId?: string;
  replayed?: boolean;
}

const OUTBOUND_DLQ_FRAGMENT = `
  id
  deliveryId
  messageId
  lastError
  replayedAt
  createdAt
`;

const LIST_QUERY = `
  query ListOutboundDLQEntries($messageId: UUID, $replayed: Boolean, $search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    outboundDlqEntries(messageId: $messageId, replayed: $replayed, search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${OUTBOUND_DLQ_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const REPLAY_MUTATION = `
  mutation ReplayOutboundDLQEntry($id: UUID!) {
    replayOutboundDlqEntry(id: $id)
  }
`;

const REPLAY_ALL_MUTATION = `
  mutation ReplayAllOutboundDLQ {
    replayAllOutboundDlq { deliveries }
  }
`;

const PURGE_MUTATION = `
  mutation PurgeOutboundDLQ($olderThan: String!) {
    purgeOutboundDlq(olderThan: $olderThan) { purged }
  }
`;

export class OutboundDLQService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListOutboundDLQOptions): Promise<{ nodes: OutboundDLQEntry[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
      if (options.messageId !== undefined) variables.messageId = options.messageId;
      if (options.replayed !== undefined) variables.replayed = options.replayed;
    }
    const data = await this.transport.execute<{ outboundDlqEntries: { nodes: OutboundDLQEntry[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.outboundDlqEntries;
  }

  async replay(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ replayOutboundDlqEntry: boolean }>(REPLAY_MUTATION, { id });
    return data.replayOutboundDlqEntry;
  }

  async replayAll(): Promise<ReplayResult> {
    const data = await this.transport.execute<{ replayAllOutboundDlq: ReplayResult }>(REPLAY_ALL_MUTATION);
    return data.replayAllOutboundDlq;
  }

  async purge(olderThan?: string): Promise<PurgeResult> {
    const data = await this.transport.execute<{ purgeOutboundDlq: PurgeResult }>(PURGE_MUTATION, { olderThan: olderThan ?? "168h" });
    return data.purgeOutboundDlq;
  }
}
