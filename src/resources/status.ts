import type { SystemStatus } from "../types.js";
import type { GraphQLTransport } from "../transport.js";

const STATUS_QUERY = `
  query GetStatus {
    status {
      status
      dlqSize
      outboundDlqSize
      queueDepth
      activeWorkers
      totalWorkers
      uptime
      version
      sourcesTotal
      destinationsTotal
      subscriptionsTotal
      eventsTotal
      eventsFailed
      deliveriesTotal
      deliveriesPending
      deliveriesDelivered
      messagesTotal
      outboundDeliveriesTotal
      outboundDeliveriesPending
      outboundDeliveriesFailed
    }
  }
`;

export class StatusService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async get(): Promise<SystemStatus> {
    const data = await this.transport.execute<{ status: SystemStatus }>(STATUS_QUERY);
    return data.status;
  }
}
