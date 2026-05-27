import type { PageInfo, ListOptions, StreamConsumer } from "../types.js";
import type { GraphQLTransport } from "../transport.js";
import { paginate } from "../pagination.js";

export type { StreamConsumer };

export interface CreateStreamConsumerInput {
  streamId: string;
  name: string;
}

const CONSUMER_FRAGMENT = `
  id
  streamId
  name
  cursorSequence
  createdAt
  updatedAt
`;

const LIST_QUERY = `
  query ListStreamConsumers($streamId: UUID!, $search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    streamConsumers(streamId: $streamId, search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${CONSUMER_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetStreamConsumer($id: UUID!) {
    streamConsumer(id: $id) { ${CONSUMER_FRAGMENT} }
  }
`;

const CREATE_MUTATION = `
  mutation CreateStreamConsumer($input: CreateStreamConsumerInput!) {
    createStreamConsumer(input: $input) { ${CONSUMER_FRAGMENT} }
  }
`;

const DELETE_MUTATION = `
  mutation DeleteStreamConsumer($id: UUID!) {
    deleteStreamConsumer(id: $id)
  }
`;

const ADVANCE_CURSOR_MUTATION = `
  mutation AdvanceConsumerCursor($id: UUID!, $sequence: Int!) {
    advanceConsumerCursor(id: $id, sequence: $sequence) { ${CONSUMER_FRAGMENT} }
  }
`;

export class StreamConsumerService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(streamId: string, options?: ListOptions): Promise<{ nodes: StreamConsumer[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = { streamId };
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
    }
    const data = await this.transport.execute<{ streamConsumers: { nodes: StreamConsumer[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.streamConsumers;
  }

  async get(id: string): Promise<StreamConsumer | null> {
    const data = await this.transport.execute<{ streamConsumer: StreamConsumer | null }>(GET_QUERY, { id });
    return data.streamConsumer;
  }

  async create(input: CreateStreamConsumerInput): Promise<StreamConsumer> {
    const data = await this.transport.execute<{ createStreamConsumer: StreamConsumer }>(CREATE_MUTATION, { input });
    return data.createStreamConsumer;
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ deleteStreamConsumer: boolean }>(DELETE_MUTATION, { id });
    return data.deleteStreamConsumer;
  }

  async advanceCursor(id: string, sequence: number): Promise<StreamConsumer> {
    const data = await this.transport.execute<{ advanceConsumerCursor: StreamConsumer }>(ADVANCE_CURSOR_MUTATION, { id, sequence });
    return data.advanceConsumerCursor;
  }

  iterate(streamId: string, options?: ListOptions): AsyncGenerator<StreamConsumer, void, unknown> {
    return paginate((o) => this.list(streamId, o), options);
  }
}
