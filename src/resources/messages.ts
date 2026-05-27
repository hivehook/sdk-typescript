import type { Message, MessageStatus, OutboundDelivery, RetryPolicy, PageInfo, ListOptions } from "../types.js";
import type { GraphQLTransport } from "../transport.js";
import { paginate } from "../pagination.js";

function utf8ToBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export interface SendMessageInput {
  applicationId: string;
  eventType: string;
  payload: string;
  idempotencyKey?: string;
  broadcast?: boolean;
}

export interface BroadcastMessageInput {
  applicationId: string;
  eventType: string;
  payload: string;
  idempotencyKey?: string;
}

export interface SendDynamicMessageInput {
  url: string;
  eventType: string;
  payload: string;
  headers?: Record<string, unknown>;
  signingSecret?: string;
  retryPolicy?: RetryPolicy;
  timeoutMs?: number;
  rateLimitRps?: number;
  idempotencyKey?: string;
}

export interface ListMessagesOptions extends ListOptions {
  applicationId?: string;
  eventType?: string;
  status?: MessageStatus;
}

const MESSAGE_FRAGMENT = `
  id
  applicationId
  eventType
  payload
  idempotencyKey
  status
  createdAt
`;

const LIST_QUERY = `
  query ListMessages($applicationId: UUID, $eventType: String, $status: MessageStatus, $search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    messages(applicationId: $applicationId, eventType: $eventType, status: $status, search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${MESSAGE_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetMessage($id: UUID!) {
    message(id: $id) { ${MESSAGE_FRAGMENT} }
  }
`;

const SEND_MUTATION = `
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) { ${MESSAGE_FRAGMENT} }
  }
`;

const BROADCAST_MUTATION = `
  mutation BroadcastMessage($input: BroadcastMessageInput!) {
    broadcastMessage(input: $input) { ${MESSAGE_FRAGMENT} }
  }
`;

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

const SEND_DYNAMIC_MUTATION = `
  mutation SendDynamicMessage($input: SendDynamicMessageInput!) {
    sendDynamicMessage(input: $input) { ${OUTBOUND_DELIVERY_FRAGMENT} }
  }
`;

export class MessageService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListMessagesOptions): Promise<{ nodes: Message[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
      if (options.applicationId !== undefined) variables.applicationId = options.applicationId;
      if (options.eventType !== undefined) variables.eventType = options.eventType;
      if (options.status !== undefined) variables.status = options.status;
    }
    const data = await this.transport.execute<{ messages: { nodes: Message[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.messages;
  }

  async get(id: string): Promise<Message | null> {
    const data = await this.transport.execute<{ message: Message | null }>(GET_QUERY, { id });
    return data.message;
  }

  async send(input: SendMessageInput): Promise<Message> {
    const encoded = { ...input, payload: utf8ToBase64(input.payload) };
    const data = await this.transport.execute<{ sendMessage: Message }>(SEND_MUTATION, { input: encoded });
    return data.sendMessage;
  }

  async broadcast(input: BroadcastMessageInput): Promise<Message> {
    const encoded = { ...input, payload: utf8ToBase64(input.payload) };
    const data = await this.transport.execute<{ broadcastMessage: Message }>(BROADCAST_MUTATION, { input: encoded });
    return data.broadcastMessage;
  }

  async sendDynamic(input: SendDynamicMessageInput): Promise<OutboundDelivery> {
    const encoded = { ...input, payload: utf8ToBase64(input.payload) };
    const data = await this.transport.execute<{ sendDynamicMessage: OutboundDelivery }>(SEND_DYNAMIC_MUTATION, { input: encoded });
    return data.sendDynamicMessage;
  }

  iterate(options?: ListMessagesOptions): AsyncGenerator<Message, void, unknown> {
    return paginate((o) => this.list(o), options);
  }
}
