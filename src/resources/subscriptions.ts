import type { Subscription, FilterConfig, TransformConfig, PageInfo, ListOptions } from "../types.js";
import type { GraphQLTransport } from "../transport.js";
import { paginate } from "../pagination.js";

export interface CreateSubscriptionInput {
  name: string;
  sourceId: string;
  destinationId: string;
  filterConfig?: FilterConfig;
  transformConfig?: TransformConfig;
}

export interface UpdateSubscriptionInput {
  name?: string;
  sourceId?: string;
  destinationId?: string;
  filterConfig?: FilterConfig;
  transformConfig?: TransformConfig;
  enabled?: boolean;
}

export interface ListSubscriptionsOptions extends ListOptions {
  sourceId?: string;
  destinationId?: string;
  enabled?: boolean;
}

const SUBSCRIPTION_FRAGMENT = `
  id
  name
  sourceId
  destinationId
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
  transformConfig {
    envelope
    headers
  }
  enabled
  createdAt
`;

const LIST_QUERY = `
  query ListSubscriptions($sourceId: UUID, $destinationId: UUID, $enabled: Boolean, $search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    subscriptions(sourceId: $sourceId, destinationId: $destinationId, enabled: $enabled, search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${SUBSCRIPTION_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetSubscription($id: UUID!) {
    subscription(id: $id) { ${SUBSCRIPTION_FRAGMENT} }
  }
`;

const CREATE_MUTATION = `
  mutation CreateSubscription($input: CreateSubscriptionInput!) {
    createSubscription(input: $input) { ${SUBSCRIPTION_FRAGMENT} }
  }
`;

const UPDATE_MUTATION = `
  mutation UpdateSubscription($id: UUID!, $input: UpdateSubscriptionInput!) {
    updateSubscription(id: $id, input: $input) { ${SUBSCRIPTION_FRAGMENT} }
  }
`;

const DELETE_MUTATION = `
  mutation DeleteSubscription($id: UUID!) {
    deleteSubscription(id: $id)
  }
`;

export class SubscriptionService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListSubscriptionsOptions): Promise<{ nodes: Subscription[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
      if (options.sourceId !== undefined) variables.sourceId = options.sourceId;
      if (options.destinationId !== undefined) variables.destinationId = options.destinationId;
      if (options.enabled !== undefined) variables.enabled = options.enabled;
    }
    const data = await this.transport.execute<{ subscriptions: { nodes: Subscription[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.subscriptions;
  }

  async get(id: string): Promise<Subscription | null> {
    const data = await this.transport.execute<{ subscription: Subscription | null }>(GET_QUERY, { id });
    return data.subscription;
  }

  async create(input: CreateSubscriptionInput): Promise<Subscription> {
    const data = await this.transport.execute<{ createSubscription: Subscription }>(CREATE_MUTATION, { input });
    return data.createSubscription;
  }

  async update(id: string, input: UpdateSubscriptionInput): Promise<Subscription> {
    const data = await this.transport.execute<{ updateSubscription: Subscription }>(UPDATE_MUTATION, { id, input });
    return data.updateSubscription;
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ deleteSubscription: boolean }>(DELETE_MUTATION, { id });
    return data.deleteSubscription;
  }

  iterate(options?: ListSubscriptionsOptions): AsyncGenerator<Subscription, void, unknown> {
    return paginate((o) => this.list(o), options);
  }
}
