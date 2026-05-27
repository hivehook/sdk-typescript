import type { Source, SourceStatus, PageInfo, ListOptions } from "../types.js";
import type { GraphQLTransport, ExecuteOptions } from "../transport.js";
import { paginate } from "../pagination.js";

export interface CreateSourceInput {
  name: string;
  slug: string;
  providerType: string;
  verifyConfig?: Record<string, unknown>;
  rateLimitRps?: number;
  status?: SourceStatus;
  spikeProtection?: boolean;
  maxIngestRps?: number;
}

export interface UpdateSourceInput {
  name?: string;
  slug?: string;
  providerType?: string;
  verifyConfig?: Record<string, unknown>;
  status?: SourceStatus;
  rateLimitRps?: number;
  spikeProtection?: boolean;
  maxIngestRps?: number;
}

export interface ListSourcesOptions extends ListOptions {
  status?: SourceStatus;
  providerType?: string;
}

const SOURCE_FRAGMENT = `
  id
  name
  slug
  providerType
  verifyConfig
  status
  rateLimitRps
  spikeProtection
  maxIngestRps
  createdAt
`;

const LIST_QUERY = `
  query ListSources($status: SourceStatus, $providerType: String, $search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    sources(status: $status, providerType: $providerType, search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${SOURCE_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetSource($id: UUID!) {
    source(id: $id) { ${SOURCE_FRAGMENT} }
  }
`;

const CREATE_MUTATION = `
  mutation CreateSource($input: CreateSourceInput!) {
    createSource(input: $input) { ${SOURCE_FRAGMENT} }
  }
`;

const UPDATE_MUTATION = `
  mutation UpdateSource($id: UUID!, $input: UpdateSourceInput!) {
    updateSource(id: $id, input: $input) { ${SOURCE_FRAGMENT} }
  }
`;

const DELETE_MUTATION = `
  mutation DeleteSource($id: UUID!) {
    deleteSource(id: $id)
  }
`;

const ROTATE_SECRET_MUTATION = `
  mutation RotateSourceSecret($id: UUID!) {
    rotateSourceSecret(id: $id) { ${SOURCE_FRAGMENT} }
  }
`;

const CLEAR_SECONDARY_SECRET_MUTATION = `
  mutation ClearSourceSecondarySecret($id: UUID!) {
    clearSourceSecondarySecret(id: $id) { ${SOURCE_FRAGMENT} }
  }
`;

export class SourceService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(
    options?: ListSourcesOptions,
    executeOptions?: ExecuteOptions
  ): Promise<{ nodes: Source[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
      if (options.status !== undefined) variables.status = options.status;
      if (options.providerType !== undefined) variables.providerType = options.providerType;
    }
    const data = await this.transport.execute<{ sources: { nodes: Source[]; pageInfo: PageInfo } }>(LIST_QUERY, variables, executeOptions);
    return data.sources;
  }

  async get(id: string, executeOptions?: ExecuteOptions): Promise<Source | null> {
    const data = await this.transport.execute<{ source: Source | null }>(GET_QUERY, { id }, executeOptions);
    return data.source;
  }

  async create(input: CreateSourceInput): Promise<Source> {
    const data = await this.transport.execute<{ createSource: Source }>(CREATE_MUTATION, { input });
    return data.createSource;
  }

  async update(id: string, input: UpdateSourceInput): Promise<Source> {
    const data = await this.transport.execute<{ updateSource: Source }>(UPDATE_MUTATION, { id, input });
    return data.updateSource;
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ deleteSource: boolean }>(DELETE_MUTATION, { id });
    return data.deleteSource;
  }

  async rotateSecret(id: string): Promise<Source> {
    const data = await this.transport.execute<{ rotateSourceSecret: Source }>(ROTATE_SECRET_MUTATION, { id });
    return data.rotateSourceSecret;
  }

  async clearSecondarySecret(id: string): Promise<Source> {
    const data = await this.transport.execute<{ clearSourceSecondarySecret: Source }>(CLEAR_SECONDARY_SECRET_MUTATION, { id });
    return data.clearSourceSecondarySecret;
  }

  iterate(options?: ListSourcesOptions): AsyncGenerator<Source, void, unknown> {
    return paginate((o) => this.list(o), options);
  }
}
