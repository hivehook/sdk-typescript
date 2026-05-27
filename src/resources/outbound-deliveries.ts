import type { OutboundDelivery, DeliveryStatus, PageInfo, ListOptions } from "../types.js";
import type { GraphQLTransport } from "../transport.js";
import { paginate } from "../pagination.js";

export interface ListOutboundDeliveriesOptions extends ListOptions {
  messageId?: string;
  endpointId?: string;
  status?: DeliveryStatus;
}

const OUTBOUND_DELIVERY_FRAGMENT = `
  id
  messageId
  endpointId
  status
  attempts
  maxAttempts
  nextAttemptAt
  createdAt
`;

const LIST_QUERY = `
  query ListOutboundDeliveries($messageId: UUID, $endpointId: UUID, $status: DeliveryStatus, $search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    outboundDeliveries(messageId: $messageId, endpointId: $endpointId, status: $status, search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${OUTBOUND_DELIVERY_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetOutboundDelivery($id: UUID!) {
    outboundDelivery(id: $id) {
      ${OUTBOUND_DELIVERY_FRAGMENT}
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

export class OutboundDeliveryService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListOutboundDeliveriesOptions): Promise<{ nodes: OutboundDelivery[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
      if (options.messageId !== undefined) variables.messageId = options.messageId;
      if (options.endpointId !== undefined) variables.endpointId = options.endpointId;
      if (options.status !== undefined) variables.status = options.status;
    }
    const data = await this.transport.execute<{ outboundDeliveries: { nodes: OutboundDelivery[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.outboundDeliveries;
  }

  async get(id: string): Promise<OutboundDelivery | null> {
    const data = await this.transport.execute<{ outboundDelivery: OutboundDelivery | null }>(GET_QUERY, { id });
    return data.outboundDelivery;
  }

  iterate(options?: ListOutboundDeliveriesOptions): AsyncGenerator<OutboundDelivery, void, unknown> {
    return paginate((o) => this.list(o), options);
  }
}
