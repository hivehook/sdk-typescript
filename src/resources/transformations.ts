import type { Transformation, TransformTestResult, PageInfo, ListOptions } from "../types.js";
import type { GraphQLTransport } from "../transport.js";
import { paginate } from "../pagination.js";

export interface CreateTransformationInput {
  name: string;
  description?: string;
  code: string;
  failOpen?: boolean;
  timeoutMs?: number;
}

export interface UpdateTransformationInput {
  name?: string;
  description?: string;
  code?: string;
  enabled?: boolean;
  failOpen?: boolean;
  timeoutMs?: number;
}

export interface ListTransformationsOptions extends ListOptions {
  enabled?: boolean;
}

export interface TestTransformationInput {
  code: string;
  payload: Record<string, unknown>;
  eventType: string;
  headers?: Record<string, unknown>;
}

const TRANSFORMATION_FRAGMENT = `
  id
  name
  description
  code
  enabled
  failOpen
  timeoutMs
  createdAt
  updatedAt
`;

const TEST_RESULT_FRAGMENT = `
  success
  output
  error
  durationMs
`;

const LIST_QUERY = `
  query ListTransformations($enabled: Boolean, $search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    transformations(enabled: $enabled, search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${TRANSFORMATION_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetTransformation($id: UUID!) {
    transformation(id: $id) { ${TRANSFORMATION_FRAGMENT} }
  }
`;

const CREATE_MUTATION = `
  mutation CreateTransformation($input: CreateTransformationInput!) {
    createTransformation(input: $input) { ${TRANSFORMATION_FRAGMENT} }
  }
`;

const UPDATE_MUTATION = `
  mutation UpdateTransformation($id: UUID!, $input: UpdateTransformationInput!) {
    updateTransformation(id: $id, input: $input) { ${TRANSFORMATION_FRAGMENT} }
  }
`;

const DELETE_MUTATION = `
  mutation DeleteTransformation($id: UUID!) {
    deleteTransformation(id: $id)
  }
`;

const TEST_MUTATION = `
  mutation TestTransformation($input: TestTransformationInput!) {
    testTransformation(input: $input) { ${TEST_RESULT_FRAGMENT} }
  }
`;

export class TransformationService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListTransformationsOptions): Promise<{ nodes: Transformation[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
      if (options.enabled !== undefined) variables.enabled = options.enabled;
    }
    const data = await this.transport.execute<{ transformations: { nodes: Transformation[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.transformations;
  }

  async get(id: string): Promise<Transformation | null> {
    const data = await this.transport.execute<{ transformation: Transformation | null }>(GET_QUERY, { id });
    return data.transformation;
  }

  async create(input: CreateTransformationInput): Promise<Transformation> {
    const data = await this.transport.execute<{ createTransformation: Transformation }>(CREATE_MUTATION, { input });
    return data.createTransformation;
  }

  async update(id: string, input: UpdateTransformationInput): Promise<Transformation> {
    const data = await this.transport.execute<{ updateTransformation: Transformation }>(UPDATE_MUTATION, { id, input });
    return data.updateTransformation;
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ deleteTransformation: boolean }>(DELETE_MUTATION, { id });
    return data.deleteTransformation;
  }

  async test(input: TestTransformationInput): Promise<TransformTestResult> {
    const data = await this.transport.execute<{ testTransformation: TransformTestResult }>(TEST_MUTATION, { input });
    return data.testTransformation;
  }

  iterate(options?: ListTransformationsOptions): AsyncGenerator<Transformation, void, unknown> {
    return paginate((o) => this.list(o), options);
  }
}
