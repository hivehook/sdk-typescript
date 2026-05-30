import type { PageInfo, ListOptions, Stream, StreamEntry, StreamStatus } from "../types.js";
import type { GraphQLTransport } from "../transport.js";
import { paginate } from "../pagination.js";

export type { Stream, StreamEntry };

export interface ListStreamEntriesOptions {
  afterSequence?: number;
  limit?: number;
}

export interface CreateStreamInput {
  applicationId: string;
  name: string;
  retentionDays?: number;
  status?: StreamStatus;
}

export interface UpdateStreamInput {
  name?: string;
  retentionDays?: number;
  status?: StreamStatus;
}

export interface ListStreamsOptions extends ListOptions {
  applicationId?: string;
  status?: StreamStatus;
}

const STREAM_FRAGMENT = `
  id
  applicationId
  name
  status
  retentionDays
  createdAt
`;

const LIST_QUERY = `
  query ListStreams($applicationId: UUID, $status: StreamStatus, $search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    streams(applicationId: $applicationId, status: $status, search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${STREAM_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetStream($id: UUID!) {
    stream(id: $id) { ${STREAM_FRAGMENT} }
  }
`;

const CREATE_MUTATION = `
  mutation CreateStream($input: CreateStreamInput!) {
    createStream(input: $input) { ${STREAM_FRAGMENT} }
  }
`;

const UPDATE_MUTATION = `
  mutation UpdateStream($id: UUID!, $input: UpdateStreamInput!) {
    updateStream(id: $id, input: $input) { ${STREAM_FRAGMENT} }
  }
`;

const DELETE_MUTATION = `
  mutation DeleteStream($id: UUID!) {
    deleteStream(id: $id)
  }
`;

export class StreamService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListStreamsOptions): Promise<{ nodes: Stream[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
      if (options.applicationId !== undefined) variables.applicationId = options.applicationId;
      if (options.status !== undefined) variables.status = options.status;
    }
    const data = await this.transport.execute<{ streams: { nodes: Stream[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.streams;
  }

  async get(id: string): Promise<Stream | null> {
    const data = await this.transport.execute<{ stream: Stream | null }>(GET_QUERY, { id });
    return data.stream;
  }

  async create(input: CreateStreamInput): Promise<Stream> {
    const data = await this.transport.execute<{ createStream: Stream }>(CREATE_MUTATION, { input });
    return data.createStream;
  }

  async update(id: string, input: UpdateStreamInput): Promise<Stream> {
    const data = await this.transport.execute<{ updateStream: Stream }>(UPDATE_MUTATION, { id, input });
    return data.updateStream;
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ deleteStream: boolean }>(DELETE_MUTATION, { id });
    return data.deleteStream;
  }

  iterate(options?: ListStreamsOptions): AsyncGenerator<Stream, void, unknown> {
    return paginate((o) => this.list(o), options);
  }

  async entries(streamId: string, options?: ListStreamEntriesOptions): Promise<{ nodes: StreamEntry[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = { streamId };
    if (options?.afterSequence !== undefined) variables.afterSequence = options.afterSequence;
    if (options?.limit !== undefined) variables.limit = options.limit;
    const data = await this.transport.execute<{
      streamEntries: { nodes: StreamEntry[]; pageInfo: PageInfo };
    }>(STREAM_ENTRIES_QUERY, variables);
    return data.streamEntries;
  }
}

const STREAM_ENTRY_FRAGMENT = `
  id
  streamId
  sequence
  messageId
  eventType
  payload
  createdAt
`;

const STREAM_ENTRIES_QUERY = `
  query ListStreamEntries($streamId: UUID!, $afterSequence: Int, $limit: Int) {
    streamEntries(streamId: $streamId, afterSequence: $afterSequence, limit: $limit) {
      nodes { ${STREAM_ENTRY_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;
