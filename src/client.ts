import { GraphQLTransport } from "./transport.js";
import { SourceService } from "./resources/sources.js";
import { DestinationService } from "./resources/destinations.js";
import { SubscriptionService } from "./resources/subscriptions.js";
import { EventService } from "./resources/events.js";
import { DeliveryService } from "./resources/deliveries.js";
import { DLQService } from "./resources/dlq.js";
import { APIKeyService } from "./resources/apikeys.js";
import { AlertRuleService } from "./resources/alerts.js";
import { BookmarkService } from "./resources/bookmarks.js";
import { EventTypeSchemaService } from "./resources/event-type-schemas.js";
import { ApplicationService } from "./resources/applications.js";
import { EndpointService } from "./resources/endpoints.js";
import { MessageService } from "./resources/messages.js";
import { OutboundDeliveryService } from "./resources/outbound-deliveries.js";
import { OutboundDLQService } from "./resources/outbound-dlq.js";
import { StatusService } from "./resources/status.js";
import { TransformationService } from "./resources/transformations.js";
import { PortalService } from "./resources/portal.js";
import { StreamService } from "./resources/streams.js";
import { StreamConsumerService } from "./resources/stream-consumers.js";
import { StreamSinkService } from "./resources/stream-sinks.js";
import { OrganizationService } from "./resources/organizations.js";
import { UserService } from "./resources/users.js";
import { AuditLogService } from "./resources/audit-logs.js";
import { MetaEventConfigService } from "./resources/meta-event-configs.js";

interface HivehookClientOptions {
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
}

class HivehookClient {
  sources: SourceService;
  destinations: DestinationService;
  subscriptions: SubscriptionService;
  events: EventService;
  deliveries: DeliveryService;
  dlq: DLQService;
  apiKeys: APIKeyService;
  alertRules: AlertRuleService;
  bookmarks: BookmarkService;
  eventTypeSchemas: EventTypeSchemaService;
  applications: ApplicationService;
  endpoints: EndpointService;
  messages: MessageService;
  outboundDeliveries: OutboundDeliveryService;
  outboundDlq: OutboundDLQService;
  status: StatusService;
  transformations: TransformationService;
  portal: PortalService;
  streams: StreamService;
  streamConsumers: StreamConsumerService;
  streamSinks: StreamSinkService;
  organizations: OrganizationService;
  users: UserService;
  auditLogs: AuditLogService;
  metaEventConfigs: MetaEventConfigService;

  constructor(options: HivehookClientOptions = {}) {
    const transport = new GraphQLTransport(
      options.baseUrl ?? "http://localhost:8080",
      options.apiKey,
      options.fetch,
      { timeoutMs: options.timeoutMs, maxRetries: options.maxRetries }
    );
    this.sources = new SourceService(transport);
    this.destinations = new DestinationService(transport);
    this.subscriptions = new SubscriptionService(transport);
    this.events = new EventService(transport);
    this.deliveries = new DeliveryService(transport);
    this.dlq = new DLQService(transport);
    this.apiKeys = new APIKeyService(transport);
    this.alertRules = new AlertRuleService(transport);
    this.bookmarks = new BookmarkService(transport);
    this.eventTypeSchemas = new EventTypeSchemaService(transport);
    this.applications = new ApplicationService(transport);
    this.endpoints = new EndpointService(transport);
    this.messages = new MessageService(transport);
    this.outboundDeliveries = new OutboundDeliveryService(transport);
    this.outboundDlq = new OutboundDLQService(transport);
    this.status = new StatusService(transport);
    this.transformations = new TransformationService(transport);
    this.portal = new PortalService(transport);
    this.streams = new StreamService(transport);
    this.streamConsumers = new StreamConsumerService(transport);
    this.streamSinks = new StreamSinkService(transport);
    this.organizations = new OrganizationService(transport);
    this.users = new UserService(transport);
    this.auditLogs = new AuditLogService(transport);
    this.metaEventConfigs = new MetaEventConfigService(transport);
  }
}

export { HivehookClient };
export type { HivehookClientOptions };
