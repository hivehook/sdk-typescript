import type { AuditLog, PageInfo, ListOptions } from "../types.js";
import type { GraphQLTransport } from "../transport.js";

export interface ListAuditLogsOptions extends ListOptions {
  actorType?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  since?: string;
  until?: string;
}

const AUDIT_LOG_FRAGMENT = `
  id
  actorType
  actorId
  actorName
  action
  resourceType
  resourceId
  orgId
  ipAddress
  userAgent
  details
  createdAt
`;

const LIST_QUERY = `
  query ListAuditLogs($actorType: String, $resourceType: String, $resourceId: UUID, $action: String, $since: Time, $until: Time, $search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    auditLogs(actorType: $actorType, resourceType: $resourceType, resourceId: $resourceId, action: $action, since: $since, until: $until, search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${AUDIT_LOG_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetAuditLog($id: UUID!) {
    auditLog(id: $id) { ${AUDIT_LOG_FRAGMENT} }
  }
`;

export class AuditLogService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListAuditLogsOptions): Promise<{ nodes: AuditLog[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
      if (options.actorType !== undefined) variables.actorType = options.actorType;
      if (options.resourceType !== undefined) variables.resourceType = options.resourceType;
      if (options.resourceId !== undefined) variables.resourceId = options.resourceId;
      if (options.action !== undefined) variables.action = options.action;
      if (options.since !== undefined) variables.since = options.since;
      if (options.until !== undefined) variables.until = options.until;
    }
    const data = await this.transport.execute<{ auditLogs: { nodes: AuditLog[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.auditLogs;
  }

  async get(id: string): Promise<AuditLog | null> {
    const data = await this.transport.execute<{ auditLog: AuditLog | null }>(GET_QUERY, { id });
    return data.auditLog;
  }
}
