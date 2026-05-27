import type { PageInfo, ListOptions, StreamSink, SinkType, SinkStatus } from "../types.js";
import type { GraphQLTransport } from "../transport.js";
import { paginate } from "../pagination.js";

export type { StreamSink };

export interface CreateStreamSinkInput {
  streamId: string;
  name: string;
  sinkType: SinkType;
  config: Record<string, unknown>;
  batchSize?: number;
  flushInterval?: string;
}

export interface UpdateStreamSinkInput {
  name?: string;
  config?: Record<string, unknown>;
  batchSize?: number;
  flushInterval?: string;
  status?: SinkStatus;
}

export interface ListStreamSinksOptions extends ListOptions {
  status?: SinkStatus;
}

const SINK_FRAGMENT = `
  id
  streamId
  name
  sinkType
  config
  batchSize
  flushInterval
  cursorSequence
  status
  lastFlushedAt
  createdAt
`;

const LIST_QUERY = `
  query ListStreamSinks($streamId: UUID!, $status: SinkStatus, $search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    streamSinks(streamId: $streamId, status: $status, search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${SINK_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetStreamSink($id: UUID!) {
    streamSink(id: $id) { ${SINK_FRAGMENT} }
  }
`;

const CREATE_MUTATION = `
  mutation CreateStreamSink($input: CreateStreamSinkInput!) {
    createStreamSink(input: $input) { ${SINK_FRAGMENT} }
  }
`;

const UPDATE_MUTATION = `
  mutation UpdateStreamSink($id: UUID!, $input: UpdateStreamSinkInput!) {
    updateStreamSink(id: $id, input: $input) { ${SINK_FRAGMENT} }
  }
`;

const DELETE_MUTATION = `
  mutation DeleteStreamSink($id: UUID!) {
    deleteStreamSink(id: $id)
  }
`;

export class StreamSinkService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(streamId: string, options?: ListStreamSinksOptions): Promise<{ nodes: StreamSink[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = { streamId };
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
      if (options.status !== undefined) variables.status = options.status;
    }
    const data = await this.transport.execute<{ streamSinks: { nodes: StreamSink[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.streamSinks;
  }

  async get(id: string): Promise<StreamSink | null> {
    const data = await this.transport.execute<{ streamSink: StreamSink | null }>(GET_QUERY, { id });
    return data.streamSink;
  }

  async create(input: CreateStreamSinkInput): Promise<StreamSink> {
    const data = await this.transport.execute<{ createStreamSink: StreamSink }>(CREATE_MUTATION, { input });
    return data.createStreamSink;
  }

  async update(id: string, input: UpdateStreamSinkInput): Promise<StreamSink> {
    const data = await this.transport.execute<{ updateStreamSink: StreamSink }>(UPDATE_MUTATION, { id, input });
    return data.updateStreamSink;
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ deleteStreamSink: boolean }>(DELETE_MUTATION, { id });
    return data.deleteStreamSink;
  }

  iterate(streamId: string, options?: ListStreamSinksOptions): AsyncGenerator<StreamSink, void, unknown> {
    return paginate((o) => this.list(streamId, o), options);
  }
}
