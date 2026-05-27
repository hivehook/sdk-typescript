import type { Endpoint, EndpointStatus, DestinationType, FilterConfig, RetryPolicy, PageInfo, ListOptions, AuthType, OAuth2Config, DeliveryMode, OutboundDelivery, HealthConfig } from "../types.js";
import type { GraphQLTransport } from "../transport.js";
import { paginate } from "../pagination.js";

export interface CreateEndpointInput {
  applicationId: string;
  url: string;
  type?: DestinationType;
  typeConfig?: Record<string, unknown>;
  filterConfig?: FilterConfig;
  rateLimitRps?: number;
  timeoutMs?: number;
  retryPolicy?: RetryPolicy;
  headers?: Record<string, unknown>;
  authType?: AuthType;
  oauth2Config?: OAuth2Config;
  mtlsCert?: string;
  mtlsKey?: string;
  deliveryMode?: DeliveryMode;
  ordered?: boolean;
  healthConfig?: HealthConfig;
  outputFormat?: string;
}

export interface UpdateEndpointInput {
  url?: string;
  filterConfig?: FilterConfig;
  status?: EndpointStatus;
  type?: DestinationType;
  typeConfig?: Record<string, unknown>;
  rateLimitRps?: number;
  timeoutMs?: number;
  retryPolicy?: RetryPolicy;
  headers?: Record<string, unknown>;
  authType?: AuthType;
  oauth2Config?: OAuth2Config;
  mtlsCert?: string;
  mtlsKey?: string;
  deliveryMode?: DeliveryMode;
  ordered?: boolean;
  healthConfig?: HealthConfig;
  outputFormat?: string;
}

export interface ListEndpointsOptions extends ListOptions {
  applicationId?: string;
  status?: EndpointStatus;
}

const ENDPOINT_FRAGMENT = `
  id
  applicationId
  url
  signingSecret
  status
  type
  typeConfig
  rateLimitRps
  timeoutMs
  retryPolicy {
    maxAttempts
    initialDelay
    maxDelay
    backoffFactor
  }
  filterConfig {
    eventTypes
    regex
    bodyMatch {
      path
      value
      operator
    }
    rules {
      path
      operator
      value
      rules {
        path
        operator
        value
      }
    }
  }
  headers
  authType
  oauth2Config {
    tokenUrl
    clientId
    clientSecret
    scopes
    audience
  }
  mtlsCert
  mtlsKey
  deliveryMode
  pollApiKeyPrefix
  pollApiKey
  ordered
  blockedDeliveryId
  healthScore
  disabledReason
  healthConfig {
    windowHours
    disableBelow
  }
  outputFormat
  createdAt
`;

const LIST_QUERY = `
  query ListEndpoints($applicationId: UUID, $status: EndpointStatus, $search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    endpoints(applicationId: $applicationId, status: $status, search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${ENDPOINT_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetEndpoint($id: UUID!) {
    endpoint(id: $id) { ${ENDPOINT_FRAGMENT} }
  }
`;

const CREATE_MUTATION = `
  mutation CreateEndpoint($input: CreateEndpointInput!) {
    createEndpoint(input: $input) { ${ENDPOINT_FRAGMENT} }
  }
`;

const UPDATE_MUTATION = `
  mutation UpdateEndpoint($id: UUID!, $input: UpdateEndpointInput!) {
    updateEndpoint(id: $id, input: $input) { ${ENDPOINT_FRAGMENT} }
  }
`;

const DELETE_MUTATION = `
  mutation DeleteEndpoint($id: UUID!) {
    deleteEndpoint(id: $id)
  }
`;

const ROTATE_SECRET_MUTATION = `
  mutation RotateEndpointSecret($id: UUID!) {
    rotateEndpointSecret(id: $id) { ${ENDPOINT_FRAGMENT} }
  }
`;

const POLL_OUTBOUND_DELIVERIES_QUERY = `
  query PollOutboundDeliveries($endpointId: UUID!, $cursor: String, $limit: Int) {
    pollOutboundDeliveries(endpointId: $endpointId, cursor: $cursor, limit: $limit) {
      nodes {
        id messageId endpointId status attempts maxAttempts nextAttemptAt createdAt
      }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const ACK_OUTBOUND_DELIVERIES_MUTATION = `
  mutation AckOutboundDeliveries($endpointId: UUID!, $deliveryIds: [UUID!]!) {
    ackOutboundDeliveries(endpointId: $endpointId, deliveryIds: $deliveryIds)
  }
`;

const SKIP_OUTBOUND_DLQ_ENTRY_MUTATION = `
  mutation SkipOutboundDLQEntry($id: UUID!) {
    skipOutboundDlqEntry(id: $id)
  }
`;

const REGENERATE_OUTBOUND_POLL_API_KEY_MUTATION = `
  mutation RegenerateOutboundPollApiKey($endpointId: UUID!) {
    regenerateOutboundPollApiKey(endpointId: $endpointId) { ${ENDPOINT_FRAGMENT} }
  }
`;

export class EndpointService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListEndpointsOptions): Promise<{ nodes: Endpoint[]; pageInfo: PageInfo }> {
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
    const data = await this.transport.execute<{ endpoints: { nodes: Endpoint[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.endpoints;
  }

  async get(id: string): Promise<Endpoint | null> {
    const data = await this.transport.execute<{ endpoint: Endpoint | null }>(GET_QUERY, { id });
    return data.endpoint;
  }

  async create(input: CreateEndpointInput): Promise<Endpoint> {
    const data = await this.transport.execute<{ createEndpoint: Endpoint }>(CREATE_MUTATION, { input });
    return data.createEndpoint;
  }

  async update(id: string, input: UpdateEndpointInput): Promise<Endpoint> {
    const data = await this.transport.execute<{ updateEndpoint: Endpoint }>(UPDATE_MUTATION, { id, input });
    return data.updateEndpoint;
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ deleteEndpoint: boolean }>(DELETE_MUTATION, { id });
    return data.deleteEndpoint;
  }

  async rotateSecret(id: string): Promise<Endpoint> {
    const data = await this.transport.execute<{ rotateEndpointSecret: Endpoint }>(ROTATE_SECRET_MUTATION, { id });
    return data.rotateEndpointSecret;
  }

  async pollDeliveries(endpointId: string, options?: { cursor?: string; limit?: number }): Promise<{ nodes: OutboundDelivery[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = { endpointId };
    if (options?.cursor !== undefined) variables.cursor = options.cursor;
    if (options?.limit !== undefined) variables.limit = options.limit;
    const data = await this.transport.execute<{ pollOutboundDeliveries: { nodes: OutboundDelivery[]; pageInfo: PageInfo } }>(POLL_OUTBOUND_DELIVERIES_QUERY, variables);
    return data.pollOutboundDeliveries;
  }

  async ackDeliveries(endpointId: string, deliveryIds: string[]): Promise<number> {
    const data = await this.transport.execute<{ ackOutboundDeliveries: number }>(ACK_OUTBOUND_DELIVERIES_MUTATION, { endpointId, deliveryIds });
    return data.ackOutboundDeliveries;
  }

  async skipOutboundDLQEntry(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ skipOutboundDlqEntry: boolean }>(SKIP_OUTBOUND_DLQ_ENTRY_MUTATION, { id });
    return data.skipOutboundDlqEntry;
  }

  async regeneratePollApiKey(endpointId: string): Promise<Endpoint> {
    const data = await this.transport.execute<{ regenerateOutboundPollApiKey: Endpoint }>(REGENERATE_OUTBOUND_POLL_API_KEY_MUTATION, { endpointId });
    return data.regenerateOutboundPollApiKey;
  }

  iterate(options?: ListEndpointsOptions): AsyncGenerator<Endpoint, void, unknown> {
    return paginate((o) => this.list(o), options);
  }
}
