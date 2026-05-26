import type { Organization, PageInfo, ListOptions } from "../types.js";
import type { GraphQLTransport } from "../transport.js";

export interface CreateOrganizationInput {
  name: string;
  slug: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
}

export interface SSOConfigInput {
  provider: string;
  idpMetadataUrl?: string;
  entityId?: string;
  acsBaseUrl?: string;
  issuer?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUrl?: string;
}

export interface RetentionInput {
  retentionEvents: number;
  retentionMessages: number;
}

export interface OTLPConfigInput {
  endpoint: string;
  headers?: Record<string, string>;
  insecure?: boolean;
  sampleRate?: number;
}

const ORGANIZATION_FRAGMENT = `
  id
  name
  slug
  ssoEnabled
  ssoProvider
  retentionEvents
  retentionMessages
  otlpConfig { endpoint headers insecure sampleRate }
  createdAt
  updatedAt
`;

const LIST_QUERY = `
  query ListOrganizations($search: String, $limit: Int, $offset: Int) {
    organizations(search: $search, limit: $limit, offset: $offset) {
      nodes { ${ORGANIZATION_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetOrganization($id: UUID!) {
    organization(id: $id) { ${ORGANIZATION_FRAGMENT} }
  }
`;

const CREATE_MUTATION = `
  mutation CreateOrganization($input: CreateOrganizationInput!) {
    createOrganization(input: $input) { ${ORGANIZATION_FRAGMENT} }
  }
`;

const UPDATE_MUTATION = `
  mutation UpdateOrganization($id: UUID!, $input: UpdateOrganizationInput!) {
    updateOrganization(id: $id, input: $input) { ${ORGANIZATION_FRAGMENT} }
  }
`;

const DELETE_MUTATION = `
  mutation DeleteOrganization($id: UUID!) {
    deleteOrganization(id: $id)
  }
`;

const CONFIGURE_SSO_MUTATION = `
  mutation ConfigureSSO($organizationId: UUID!, $input: SSOConfigInput!) {
    configureSSO(organizationId: $organizationId, input: $input) { ${ORGANIZATION_FRAGMENT} }
  }
`;

const DISABLE_SSO_MUTATION = `
  mutation DisableSSO($organizationId: UUID!) {
    disableSSO(organizationId: $organizationId) { ${ORGANIZATION_FRAGMENT} }
  }
`;

const UPDATE_RETENTION_MUTATION = `
  mutation UpdateOrganizationRetention($organizationId: UUID!, $input: RetentionInput!) {
    updateOrganizationRetention(organizationId: $organizationId, input: $input) { ${ORGANIZATION_FRAGMENT} }
  }
`;

const DELETE_DATA_MUTATION = `
  mutation DeleteOrganizationData($organizationId: UUID!) {
    deleteOrganizationData(organizationId: $organizationId)
  }
`;

const EXPORT_DATA_MUTATION = `
  mutation ExportOrganizationData($organizationId: UUID!) {
    exportOrganizationData(organizationId: $organizationId)
  }
`;

const CONFIGURE_OTLP_MUTATION = `
  mutation ConfigureOTLP($organizationId: UUID!, $input: OTLPConfigInput!) {
    configureOTLP(organizationId: $organizationId, input: $input) { ${ORGANIZATION_FRAGMENT} }
  }
`;

const DISABLE_OTLP_MUTATION = `
  mutation DisableOTLP($organizationId: UUID!) {
    disableOTLP(organizationId: $organizationId) { ${ORGANIZATION_FRAGMENT} }
  }
`;

export class OrganizationService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListOptions): Promise<{ nodes: Organization[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.search !== undefined) variables.search = options.search;
    }
    const data = await this.transport.execute<{ organizations: { nodes: Organization[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.organizations;
  }

  async get(id: string): Promise<Organization | null> {
    const data = await this.transport.execute<{ organization: Organization | null }>(GET_QUERY, { id });
    return data.organization;
  }

  async create(input: CreateOrganizationInput): Promise<Organization> {
    const data = await this.transport.execute<{ createOrganization: Organization }>(CREATE_MUTATION, { input });
    return data.createOrganization;
  }

  async update(id: string, input: UpdateOrganizationInput): Promise<Organization> {
    const data = await this.transport.execute<{ updateOrganization: Organization }>(UPDATE_MUTATION, { id, input });
    return data.updateOrganization;
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ deleteOrganization: boolean }>(DELETE_MUTATION, { id });
    return data.deleteOrganization;
  }

  async configureSSO(organizationId: string, input: SSOConfigInput): Promise<Organization> {
    const data = await this.transport.execute<{ configureSSO: Organization }>(CONFIGURE_SSO_MUTATION, { organizationId, input });
    return data.configureSSO;
  }

  async disableSSO(organizationId: string): Promise<Organization> {
    const data = await this.transport.execute<{ disableSSO: Organization }>(DISABLE_SSO_MUTATION, { organizationId });
    return data.disableSSO;
  }

  async updateRetention(organizationId: string, input: RetentionInput): Promise<Organization> {
    const data = await this.transport.execute<{ updateOrganizationRetention: Organization }>(UPDATE_RETENTION_MUTATION, { organizationId, input });
    return data.updateOrganizationRetention;
  }

  async deleteData(organizationId: string): Promise<boolean> {
    const data = await this.transport.execute<{ deleteOrganizationData: boolean }>(DELETE_DATA_MUTATION, { organizationId });
    return data.deleteOrganizationData;
  }

  async exportData(organizationId: string): Promise<Record<string, unknown>> {
    const data = await this.transport.execute<{ exportOrganizationData: Record<string, unknown> }>(EXPORT_DATA_MUTATION, { organizationId });
    return data.exportOrganizationData;
  }

  async configureOTLP(organizationId: string, input: OTLPConfigInput): Promise<Organization> {
    const data = await this.transport.execute<{ configureOTLP: Organization }>(CONFIGURE_OTLP_MUTATION, { organizationId, input });
    return data.configureOTLP;
  }

  async disableOTLP(organizationId: string): Promise<Organization> {
    const data = await this.transport.execute<{ disableOTLP: Organization }>(DISABLE_OTLP_MUTATION, { organizationId });
    return data.disableOTLP;
  }
}
