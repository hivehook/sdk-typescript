import type { Event, EventStatus, PageInfo, ListOptions } from "../types.js";
import type { GraphQLTransport } from "../transport.js";
import { paginate } from "../pagination.js";

export interface ListEventsOptions extends ListOptions {
  sourceId?: string;
  eventType?: string;
  status?: EventStatus;
}

const EVENT_FRAGMENT = `
  id
  sourceId
  idempotencyKey
  eventType
  headers
  rawBody
  status
  receivedAt
`;

const LIST_QUERY = `
  query ListEvents($sourceId: UUID, $eventType: String, $status: EventStatus, $search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    events(sourceId: $sourceId, eventType: $eventType, status: $status, search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${EVENT_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetEvent($id: UUID!) {
    event(id: $id) { ${EVENT_FRAGMENT} }
  }
`;

export class EventService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListEventsOptions): Promise<{ nodes: Event[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
      if (options.sourceId !== undefined) variables.sourceId = options.sourceId;
      if (options.eventType !== undefined) variables.eventType = options.eventType;
      if (options.status !== undefined) variables.status = options.status;
    }
    const data = await this.transport.execute<{ events: { nodes: Event[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.events;
  }

  async get(id: string): Promise<Event | null> {
    const data = await this.transport.execute<{ event: Event | null }>(GET_QUERY, { id });
    return data.event;
  }

  iterate(options?: ListEventsOptions): AsyncGenerator<Event, void, unknown> {
    return paginate((o) => this.list(o), options);
  }
}
