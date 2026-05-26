export type SourceStatus = "ACTIVE" | "INACTIVE";
export type DestinationStatus = "ACTIVE" | "INACTIVE";
export type EventStatus = "PENDING" | "DELIVERED" | "FAILED";
export type DeliveryStatus = "PENDING" | "DELIVERED" | "FAILED" | "SUPERSEDED" | "SKIPPED";
export type EndpointStatus = "ACTIVE" | "INACTIVE";
export type MessageStatus = "PENDING" | "DELIVERED" | "FAILED";
export type AuthType = "NONE" | "HEADER" | "OAUTH2" | "MTLS";
export type DeliveryMode = "PUSH" | "POLL";
export type DestinationType = "HTTP" | "SQS" | "EVENTBRIDGE" | "PUBSUB" | "KAFKA" | "RABBITMQ" | "MOCK" | "CONNECTOR";

export interface OAuth2Config {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes?: string[];
  audience?: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  initialDelay: string;
  maxDelay: string;
  backoffFactor: number;
}

export interface HealthConfig {
  windowHours: number;
  disableBelow: number;
}

export interface BodyMatchRule {
  path: string;
  value: string;
  operator: string;
}

export interface FilterRule {
  path?: string;
  operator: string;
  value?: unknown;
  rules?: FilterRule[];
}

export interface FilterConfig {
  eventTypes?: string[];
  regex?: string[];
  bodyMatch?: BodyMatchRule[];
  rules?: FilterRule[];
}

export interface TransformConfig {
  envelope: boolean;
  headers?: Record<string, unknown>;
}

export interface ResponseConfig {
  statusCode: number;
  body: string;
  contentType: string;
}

export interface DedupConfig {
  strategy: string;
  fields?: string[];
  window?: string;
}

export interface Source {
  id: string;
  name: string;
  slug: string;
  providerType: string;
  verifyConfig?: Record<string, unknown>;
  status: SourceStatus;
  rateLimitRps: number;
  spikeProtection: boolean;
  maxIngestRps: number;
  brokerConfig?: Record<string, unknown>;
  responseConfig?: ResponseConfig;
  dedupConfig?: DedupConfig;
  createdAt: string;
  subscriptions?: Subscription[];
}

export interface Destination {
  id: string;
  name: string;
  url: string;
  signingSecret: string;
  status: DestinationStatus;
  type: DestinationType;
  typeConfig?: Record<string, unknown>;
  timeoutMs: number;
  rateLimitRps: number;
  retryPolicy?: RetryPolicy;
  headers?: Record<string, unknown>;
  authType?: AuthType;
  oauth2Config?: OAuth2Config;
  mtlsCert?: string;
  mtlsKey?: string;
  deliveryMode: DeliveryMode;
  pollApiKeyPrefix?: string;
  pollApiKey?: string;
  ordered: boolean;
  blockedDeliveryId?: string;
  healthScore: number;
  disabledReason?: string;
  healthConfig?: HealthConfig;
  outputFormat: string;
  createdAt: string;
  subscriptions?: Subscription[];
}

export interface Subscription {
  id: string;
  name: string;
  sourceId: string;
  destinationId: string;
  filterConfig?: FilterConfig;
  transformConfig?: TransformConfig;
  enabled: boolean;
  createdAt: string;
  source?: Source;
  destination?: Destination;
}

export interface Event {
  id: string;
  sourceId: string;
  idempotencyKey: string;
  eventType: string;
  headers?: Record<string, unknown>;
  rawBody?: string;
  status: EventStatus;
  receivedAt: string;
  source?: Source;
  deliveries?: Delivery[];
}

export interface DeliveryAttempt {
  id: string;
  deliveryId: string;
  attemptNumber: number;
  responseStatus: number;
  responseBody: string;
  error: string;
  durationMs: number;
  attemptedAt: string;
}

export interface Delivery {
  id: string;
  eventId: string;
  subscriptionId: string;
  destinationId: string;
  status: DeliveryStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string;
  createdAt: string;
  event?: Event;
  subscription?: Subscription;
  destination?: Destination;
  deliveryAttempts?: DeliveryAttempt[];
}

export interface DLQEntry {
  id: string;
  deliveryId: string;
  eventId: string;
  lastError: string;
  replayedAt?: string;
  createdAt: string;
  delivery?: Delivery;
  event?: Event;
}

export interface APIKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  sourceIds: string[];
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
  lastUsedAt?: string;
}

export interface APIKeyWithSecret {
  apiKey: APIKey;
  rawKey: string;
}

export type AlertChannel = "WEBHOOK" | "EMAIL" | "SLACK";

export interface EmailAlertConfig {
  to: string[];
  subjectTemplate?: string;
}

export interface SlackAlertConfig {
  webhookUrl: string;
  channel?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  conditionType: string;
  threshold: number;
  webhookUrl: string;
  channel: AlertChannel;
  emailConfig?: EmailAlertConfig;
  slackConfig?: SlackAlertConfig;
  cooldown: string;
  enabled: boolean;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  eventId: string;
  name: string;
  notes: string;
  createdAt: string;
  event?: Event;
}

export interface EventTypeSchema {
  id: string;
  eventType: string;
  description: string;
  schema?: Record<string, unknown>;
  example?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  name: string;
  uid: string;
  createdAt: string;
  endpoints?: Endpoint[];
}

export interface Endpoint {
  id: string;
  applicationId: string;
  url: string;
  signingSecret: string;
  filterConfig?: FilterConfig;
  status: EndpointStatus;
  type: DestinationType;
  typeConfig?: Record<string, unknown>;
  rateLimitRps: number;
  timeoutMs: number;
  retryPolicy?: RetryPolicy;
  headers?: Record<string, unknown>;
  authType?: AuthType;
  oauth2Config?: OAuth2Config;
  mtlsCert?: string;
  mtlsKey?: string;
  deliveryMode: DeliveryMode;
  pollApiKeyPrefix?: string;
  pollApiKey?: string;
  ordered: boolean;
  blockedDeliveryId?: string;
  healthScore: number;
  disabledReason?: string;
  healthConfig?: HealthConfig;
  outputFormat: string;
  createdAt: string;
  application?: Application;
}

export interface Message {
  id: string;
  applicationId: string;
  eventType: string;
  payload?: string;
  idempotencyKey: string;
  status: MessageStatus;
  createdAt: string;
  application?: Application;
  outboundDeliveries?: OutboundDelivery[];
}

export interface OutboundDeliveryAttempt {
  id: string;
  deliveryId: string;
  attemptNumber: number;
  responseStatus: number;
  responseBody: string;
  error: string;
  durationMs: number;
  attemptedAt: string;
}

export interface OutboundDelivery {
  id: string;
  messageId: string;
  endpointId: string;
  status: DeliveryStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string;
  createdAt: string;
  message?: Message;
  endpoint?: Endpoint;
  deliveryAttempts?: OutboundDeliveryAttempt[];
}

export interface OutboundDLQEntry {
  id: string;
  deliveryId: string;
  messageId: string;
  lastError: string;
  replayedAt?: string;
  createdAt: string;
  delivery?: OutboundDelivery;
  message?: Message;
}

export interface Transformation {
  id: string;
  name: string;
  description: string;
  code: string;
  enabled: boolean;
  failOpen: boolean;
  timeoutMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransformTestResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  durationMs: number;
}

export interface SystemStatus {
  status: string;
  dlqSize: number;
  outboundDlqSize: number;
  queueDepth: number;
  activeWorkers: number;
  totalWorkers: number;
  uptime: number;
  version: string;
  sourcesTotal: number;
  destinationsTotal: number;
  subscriptionsTotal: number;
  eventsTotal: number;
  eventsFailed: number;
  deliveriesTotal: number;
  deliveriesPending: number;
  deliveriesDelivered: number;
  messagesTotal: number;
  outboundDeliveriesTotal: number;
  outboundDeliveriesPending: number;
  outboundDeliveriesFailed: number;
}

export interface OTLPConfig {
  endpoint: string;
  headers?: Record<string, string>;
  insecure: boolean;
  sampleRate: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ssoEnabled: boolean;
  ssoProvider?: string;
  retentionEvents: number;
  retentionMessages: number;
  otlpConfig?: OTLPConfig;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorType: string;
  actorId: string;
  actorName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  orgId: string;
  ipAddress: string;
  userAgent: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface PageInfo {
  total: number;
  limit: number;
  offset: number;
  endCursor?: string;
  hasNextPage: boolean;
}

export interface ReplayResult {
  deliveries: number;
}

export interface PurgeResult {
  purged: number;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  after?: string;
  first?: number;
  search?: string;
}

export type StreamStatus = "ACTIVE" | "PAUSED";
export type SinkType = "S3" | "WEBHOOK" | "POSTGRES";
export type SinkStatus = "ACTIVE" | "PAUSED";

export interface Stream {
  id: string;
  applicationId: string;
  name: string;
  status: StreamStatus;
  retentionDays: number;
  createdAt: string;
}

export interface StreamConsumer {
  id: string;
  streamId: string;
  name: string;
  cursorSequence: number;
  createdAt: string;
  updatedAt: string;
}

export interface StreamSink {
  id: string;
  streamId: string;
  name: string;
  sinkType: SinkType;
  config: Record<string, unknown>;
  batchSize: number;
  flushInterval: string;
  cursorSequence: number;
  status: SinkStatus;
  lastFlushedAt: string | null;
  createdAt: string;
}
