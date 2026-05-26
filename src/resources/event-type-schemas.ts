import type { EventTypeSchema, PageInfo, ListOptions } from "../types.js";
import type { GraphQLTransport } from "../transport.js";

export interface CreateEventTypeSchemaInput {
  eventType: string;
  description?: string;
  schema?: Record<string, unknown>;
  example?: Record<string, unknown>;
}

export interface UpdateEventTypeSchemaInput {
  eventType?: string;
  description?: string;
  schema?: Record<string, unknown>;
  example?: Record<string, unknown>;
}

const EVENT_TYPE_SCHEMA_FRAGMENT = `
  id
  eventType
  description
  schema
  example
  createdAt
  updatedAt
`;

const LIST_QUERY = `
  query ListEventTypeSchemas($search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    eventTypeSchemas(search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${EVENT_TYPE_SCHEMA_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetEventTypeSchema($id: UUID!) {
    eventTypeSchema(id: $id) { ${EVENT_TYPE_SCHEMA_FRAGMENT} }
  }
`;

const CREATE_MUTATION = `
  mutation CreateEventTypeSchema($input: CreateEventTypeSchemaInput!) {
    createEventTypeSchema(input: $input) { ${EVENT_TYPE_SCHEMA_FRAGMENT} }
  }
`;

const UPDATE_MUTATION = `
  mutation UpdateEventTypeSchema($id: UUID!, $input: UpdateEventTypeSchemaInput!) {
    updateEventTypeSchema(id: $id, input: $input) { ${EVENT_TYPE_SCHEMA_FRAGMENT} }
  }
`;

const DELETE_MUTATION = `
  mutation DeleteEventTypeSchema($id: UUID!) {
    deleteEventTypeSchema(id: $id)
  }
`;

export class EventTypeSchemaService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListOptions): Promise<{ nodes: EventTypeSchema[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
    }
    const data = await this.transport.execute<{ eventTypeSchemas: { nodes: EventTypeSchema[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.eventTypeSchemas;
  }

  async get(id: string): Promise<EventTypeSchema | null> {
    const data = await this.transport.execute<{ eventTypeSchema: EventTypeSchema | null }>(GET_QUERY, { id });
    return data.eventTypeSchema;
  }

  async create(input: CreateEventTypeSchemaInput): Promise<EventTypeSchema> {
    const data = await this.transport.execute<{ createEventTypeSchema: EventTypeSchema }>(CREATE_MUTATION, { input });
    return data.createEventTypeSchema;
  }

  async update(id: string, input: UpdateEventTypeSchemaInput): Promise<EventTypeSchema> {
    const data = await this.transport.execute<{ updateEventTypeSchema: EventTypeSchema }>(UPDATE_MUTATION, { id, input });
    return data.updateEventTypeSchema;
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ deleteEventTypeSchema: boolean }>(DELETE_MUTATION, { id });
    return data.deleteEventTypeSchema;
  }
}
