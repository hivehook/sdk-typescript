import type { User, PageInfo, ListOptions } from "../types.js";
import type { GraphQLTransport } from "../transport.js";

export interface InviteUserInput {
  email: string;
  name?: string;
  role?: string;
}

export interface UpdateUserRoleInput {
  role: string;
}

export interface ListUsersOptions extends ListOptions {
  organizationId?: string;
}

const USER_FRAGMENT = `
  id
  organizationId
  email
  name
  role
  lastLoginAt
  createdAt
  updatedAt
`;

const LIST_QUERY = `
  query ListUsers($organizationId: UUID, $search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    users(organizationId: $organizationId, search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${USER_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const ME_QUERY = `
  query Me {
    me { ${USER_FRAGMENT} }
  }
`;

const INVITE_MUTATION = `
  mutation InviteUser($organizationId: UUID!, $input: InviteUserInput!) {
    inviteUser(organizationId: $organizationId, input: $input) { ${USER_FRAGMENT} }
  }
`;

const REMOVE_MUTATION = `
  mutation RemoveUser($id: UUID!) {
    removeUser(id: $id)
  }
`;

const UPDATE_ROLE_MUTATION = `
  mutation UpdateUserRole($id: UUID!, $input: UpdateUserRoleInput!) {
    updateUserRole(id: $id, input: $input) { ${USER_FRAGMENT} }
  }
`;

export class UserService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListUsersOptions): Promise<{ nodes: User[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
      if (options.organizationId !== undefined) variables.organizationId = options.organizationId;
    }
    const data = await this.transport.execute<{ users: { nodes: User[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.users;
  }

  async me(): Promise<User | null> {
    const data = await this.transport.execute<{ me: User | null }>(ME_QUERY);
    return data.me;
  }

  async invite(organizationId: string, input: InviteUserInput): Promise<User> {
    const data = await this.transport.execute<{ inviteUser: User }>(INVITE_MUTATION, { organizationId, input });
    return data.inviteUser;
  }

  async remove(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ removeUser: boolean }>(REMOVE_MUTATION, { id });
    return data.removeUser;
  }

  async updateRole(id: string, input: UpdateUserRoleInput): Promise<User> {
    const data = await this.transport.execute<{ updateUserRole: User }>(UPDATE_ROLE_MUTATION, { id, input });
    return data.updateUserRole;
  }
}
