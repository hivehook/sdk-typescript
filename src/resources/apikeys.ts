import type { APIKey, APIKeyWithSecret, PageInfo, ListOptions } from "../types.js";
import type { GraphQLTransport } from "../transport.js";

export interface CreateAPIKeyInput {
  name: string;
  scopes?: string[];
  sourceIds?: string[];
  expiresAt?: string;
}

const APIKEY_FRAGMENT = `
  id
  name
  keyPrefix
  scopes
  sourceIds
  createdAt
  expiresAt
  revokedAt
  lastUsedAt
`;

const LIST_QUERY = `
  query ListAPIKeys($search: String, $limit: Int, $offset: Int) {
    apiKeys(search: $search, limit: $limit, offset: $offset) {
      nodes { ${APIKEY_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetAPIKey($id: UUID!) {
    apiKey(id: $id) { ${APIKEY_FRAGMENT} }
  }
`;

const CREATE_MUTATION = `
  mutation CreateAPIKey($input: CreateAPIKeyInput!) {
    createAPIKey(input: $input) {
      apiKey { ${APIKEY_FRAGMENT} }
      rawKey
    }
  }
`;

const REVOKE_MUTATION = `
  mutation RevokeAPIKey($id: UUID!) {
    revokeAPIKey(id: $id)
  }
`;

export class APIKeyService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListOptions): Promise<{ nodes: APIKey[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.search !== undefined) variables.search = options.search;
    }
    const data = await this.transport.execute<{ apiKeys: { nodes: APIKey[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.apiKeys;
  }

  async get(id: string): Promise<APIKey | null> {
    const data = await this.transport.execute<{ apiKey: APIKey | null }>(GET_QUERY, { id });
    return data.apiKey;
  }

  async create(input: CreateAPIKeyInput): Promise<APIKeyWithSecret> {
    const data = await this.transport.execute<{ createAPIKey: APIKeyWithSecret }>(CREATE_MUTATION, { input });
    return data.createAPIKey;
  }

  async revoke(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ revokeAPIKey: boolean }>(REVOKE_MUTATION, { id });
    return data.revokeAPIKey;
  }
}
