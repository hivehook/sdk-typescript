import type { Application, PageInfo, ListOptions } from "../types.js";
import type { GraphQLTransport } from "../transport.js";

export interface CreateApplicationInput {
  name: string;
}

export interface UpdateApplicationInput {
  name?: string;
}

const APPLICATION_FRAGMENT = `
  id
  name
  uid
  createdAt
`;

const LIST_QUERY = `
  query ListApplications($search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    applications(search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${APPLICATION_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetApplication($id: UUID!) {
    application(id: $id) { ${APPLICATION_FRAGMENT} }
  }
`;

const CREATE_MUTATION = `
  mutation CreateApplication($input: CreateApplicationInput!) {
    createApplication(input: $input) { ${APPLICATION_FRAGMENT} }
  }
`;

const UPDATE_MUTATION = `
  mutation UpdateApplication($id: UUID!, $input: UpdateApplicationInput!) {
    updateApplication(id: $id, input: $input) { ${APPLICATION_FRAGMENT} }
  }
`;

const DELETE_MUTATION = `
  mutation DeleteApplication($id: UUID!) {
    deleteApplication(id: $id)
  }
`;

export class ApplicationService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListOptions): Promise<{ nodes: Application[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
    }
    const data = await this.transport.execute<{ applications: { nodes: Application[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.applications;
  }

  async get(id: string): Promise<Application | null> {
    const data = await this.transport.execute<{ application: Application | null }>(GET_QUERY, { id });
    return data.application;
  }

  async create(input: CreateApplicationInput): Promise<Application> {
    const data = await this.transport.execute<{ createApplication: Application }>(CREATE_MUTATION, { input });
    return data.createApplication;
  }

  async update(id: string, input: UpdateApplicationInput): Promise<Application> {
    const data = await this.transport.execute<{ updateApplication: Application }>(UPDATE_MUTATION, { id, input });
    return data.updateApplication;
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ deleteApplication: boolean }>(DELETE_MUTATION, { id });
    return data.deleteApplication;
  }
}
