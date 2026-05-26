import type { Delivery, DeliveryStatus, PageInfo, ListOptions } from "../types.js";
import type { GraphQLTransport } from "../transport.js";

export interface ListDeliveriesOptions extends ListOptions {
  eventId?: string;
  destinationId?: string;
  subscriptionId?: string;
  status?: DeliveryStatus;
}

const DELIVERY_FRAGMENT = `
  id
  eventId
  subscriptionId
  destinationId
  status
  attempts
  maxAttempts
  nextAttemptAt
  createdAt
`;

const LIST_QUERY = `
  query ListDeliveries($eventId: UUID, $destinationId: UUID, $subscriptionId: UUID, $status: DeliveryStatus, $search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    deliveries(eventId: $eventId, destinationId: $destinationId, subscriptionId: $subscriptionId, status: $status, search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${DELIVERY_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetDelivery($id: UUID!) {
    delivery(id: $id) {
      ${DELIVERY_FRAGMENT}
      deliveryAttempts {
        id
        deliveryId
        attemptNumber
        responseStatus
        responseBody
        error
        durationMs
        attemptedAt
      }
    }
  }
`;

export class DeliveryService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListDeliveriesOptions): Promise<{ nodes: Delivery[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
      if (options.eventId !== undefined) variables.eventId = options.eventId;
      if (options.destinationId !== undefined) variables.destinationId = options.destinationId;
      if (options.subscriptionId !== undefined) variables.subscriptionId = options.subscriptionId;
      if (options.status !== undefined) variables.status = options.status;
    }
    const data = await this.transport.execute<{ deliveries: { nodes: Delivery[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.deliveries;
  }

  async get(id: string): Promise<Delivery | null> {
    const data = await this.transport.execute<{ delivery: Delivery | null }>(GET_QUERY, { id });
    return data.delivery;
  }
}
