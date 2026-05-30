import type { MetaEventConfig, PageInfo, ListOptions } from "../types.js";
import type { GraphQLTransport } from "../transport.js";
import { paginate } from "../pagination.js";

export type { MetaEventConfig };

export interface CreateMetaEventConfigInput {
  name: string;
  url: string;
  eventTypes: string[];
  enabled?: boolean;
}

export interface UpdateMetaEventConfigInput {
  name?: string;
  url?: string;
  eventTypes?: string[];
  enabled?: boolean;
}

const META_EVENT_CONFIG_FRAGMENT = `
  id
  name
  url
  signingSecret
  eventTypes
  enabled
  createdAt
`;

const LIST_QUERY = `
  query ListMetaEventConfigs($search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    metaEventConfigs(search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${META_EVENT_CONFIG_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetMetaEventConfig($id: UUID!) {
    metaEventConfig(id: $id) { ${META_EVENT_CONFIG_FRAGMENT} }
  }
`;

const CREATE_MUTATION = `
  mutation CreateMetaEventConfig($input: CreateMetaEventConfigInput!) {
    createMetaEventConfig(input: $input) { ${META_EVENT_CONFIG_FRAGMENT} }
  }
`;

const UPDATE_MUTATION = `
  mutation UpdateMetaEventConfig($id: UUID!, $input: UpdateMetaEventConfigInput!) {
    updateMetaEventConfig(id: $id, input: $input) { ${META_EVENT_CONFIG_FRAGMENT} }
  }
`;

const DELETE_MUTATION = `
  mutation DeleteMetaEventConfig($id: UUID!) {
    deleteMetaEventConfig(id: $id)
  }
`;

export class MetaEventConfigService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListOptions): Promise<{ nodes: MetaEventConfig[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
    }
    const data = await this.transport.execute<{
      metaEventConfigs: { nodes: MetaEventConfig[]; pageInfo: PageInfo };
    }>(LIST_QUERY, variables);
    return data.metaEventConfigs;
  }

  async get(id: string): Promise<MetaEventConfig | null> {
    const data = await this.transport.execute<{ metaEventConfig: MetaEventConfig | null }>(GET_QUERY, { id });
    return data.metaEventConfig;
  }

  async create(input: CreateMetaEventConfigInput): Promise<MetaEventConfig> {
    const data = await this.transport.execute<{ createMetaEventConfig: MetaEventConfig }>(
      CREATE_MUTATION,
      { input },
    );
    return data.createMetaEventConfig;
  }

  async update(id: string, input: UpdateMetaEventConfigInput): Promise<MetaEventConfig> {
    const data = await this.transport.execute<{ updateMetaEventConfig: MetaEventConfig }>(
      UPDATE_MUTATION,
      { id, input },
    );
    return data.updateMetaEventConfig;
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ deleteMetaEventConfig: boolean }>(DELETE_MUTATION, { id });
    return data.deleteMetaEventConfig;
  }

  iterate(options?: ListOptions): AsyncGenerator<MetaEventConfig, void, unknown> {
    return paginate((o) => this.list(o), options);
  }
}
