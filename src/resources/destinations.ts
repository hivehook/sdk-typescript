import type { Destination, DestinationStatus, DestinationType, RetryPolicy, PageInfo, ListOptions, AuthType, OAuth2Config, DeliveryMode, Delivery, HealthConfig } from "../types.js";
import type { GraphQLTransport } from "../transport.js";
import { paginate } from "../pagination.js";

export interface CreateDestinationInput {
  name: string;
  url: string;
  type?: DestinationType;
  typeConfig?: Record<string, unknown>;
  timeoutMs?: number;
  rateLimitRps?: number;
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

export interface UpdateDestinationInput {
  name?: string;
  url?: string;
  status?: DestinationStatus;
  type?: DestinationType;
  typeConfig?: Record<string, unknown>;
  timeoutMs?: number;
  rateLimitRps?: number;
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

export interface ListDestinationsOptions extends ListOptions {
  status?: DestinationStatus;
}

const DESTINATION_FRAGMENT = `
  id
  name
  url
  signingSecret
  status
  type
  typeConfig
  timeoutMs
  rateLimitRps
  retryPolicy {
    maxAttempts
    initialDelay
    maxDelay
    backoffFactor
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
  query ListDestinations($status: DestinationStatus, $search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    destinations(status: $status, search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${DESTINATION_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetDestination($id: UUID!) {
    destination(id: $id) { ${DESTINATION_FRAGMENT} }
  }
`;

const CREATE_MUTATION = `
  mutation CreateDestination($input: CreateDestinationInput!) {
    createDestination(input: $input) { ${DESTINATION_FRAGMENT} }
  }
`;

const UPDATE_MUTATION = `
  mutation UpdateDestination($id: UUID!, $input: UpdateDestinationInput!) {
    updateDestination(id: $id, input: $input) { ${DESTINATION_FRAGMENT} }
  }
`;

const DELETE_MUTATION = `
  mutation DeleteDestination($id: UUID!) {
    deleteDestination(id: $id)
  }
`;

const ROTATE_SECRET_MUTATION = `
  mutation RotateDestinationSecret($id: UUID!) {
    rotateDestinationSecret(id: $id) { ${DESTINATION_FRAGMENT} }
  }
`;

const POLL_DELIVERIES_QUERY = `
  query PollDeliveries($destinationId: UUID!, $cursor: String, $limit: Int) {
    pollDeliveries(destinationId: $destinationId, cursor: $cursor, limit: $limit) {
      nodes {
        id eventId subscriptionId destinationId status attempts maxAttempts nextAttemptAt createdAt
      }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const ACK_DELIVERIES_MUTATION = `
  mutation AckDeliveries($destinationId: UUID!, $deliveryIds: [UUID!]!) {
    ackDeliveries(destinationId: $destinationId, deliveryIds: $deliveryIds)
  }
`;

const SKIP_DLQ_ENTRY_MUTATION = `
  mutation SkipDLQEntry($id: UUID!) {
    skipDLQEntry(id: $id)
  }
`;

const REGENERATE_POLL_API_KEY_MUTATION = `
  mutation RegeneratePollApiKey($destinationId: UUID!) {
    regeneratePollApiKey(destinationId: $destinationId) { ${DESTINATION_FRAGMENT} }
  }
`;

export class DestinationService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListDestinationsOptions): Promise<{ nodes: Destination[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
      if (options.status !== undefined) variables.status = options.status;
    }
    const data = await this.transport.execute<{ destinations: { nodes: Destination[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.destinations;
  }

  async get(id: string): Promise<Destination | null> {
    const data = await this.transport.execute<{ destination: Destination | null }>(GET_QUERY, { id });
    return data.destination;
  }

  async create(input: CreateDestinationInput): Promise<Destination> {
    const data = await this.transport.execute<{ createDestination: Destination }>(CREATE_MUTATION, { input });
    return data.createDestination;
  }

  async update(id: string, input: UpdateDestinationInput): Promise<Destination> {
    const data = await this.transport.execute<{ updateDestination: Destination }>(UPDATE_MUTATION, { id, input });
    return data.updateDestination;
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ deleteDestination: boolean }>(DELETE_MUTATION, { id });
    return data.deleteDestination;
  }

  async rotateSecret(id: string): Promise<Destination> {
    const data = await this.transport.execute<{ rotateDestinationSecret: Destination }>(ROTATE_SECRET_MUTATION, { id });
    return data.rotateDestinationSecret;
  }

  async pollDeliveries(destinationId: string, options?: { cursor?: string; limit?: number }): Promise<{ nodes: Delivery[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = { destinationId };
    if (options?.cursor !== undefined) variables.cursor = options.cursor;
    if (options?.limit !== undefined) variables.limit = options.limit;
    const data = await this.transport.execute<{ pollDeliveries: { nodes: Delivery[]; pageInfo: PageInfo } }>(POLL_DELIVERIES_QUERY, variables);
    return data.pollDeliveries;
  }

  async ackDeliveries(destinationId: string, deliveryIds: string[]): Promise<number> {
    const data = await this.transport.execute<{ ackDeliveries: number }>(ACK_DELIVERIES_MUTATION, { destinationId, deliveryIds });
    return data.ackDeliveries;
  }

  async skipDLQEntry(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ skipDLQEntry: boolean }>(SKIP_DLQ_ENTRY_MUTATION, { id });
    return data.skipDLQEntry;
  }

  async regeneratePollApiKey(destinationId: string): Promise<Destination> {
    const data = await this.transport.execute<{ regeneratePollApiKey: Destination }>(REGENERATE_POLL_API_KEY_MUTATION, { destinationId });
    return data.regeneratePollApiKey;
  }

  iterate(options?: ListDestinationsOptions): AsyncGenerator<Destination, void, unknown> {
    return paginate((o) => this.list(o), options);
  }
}
