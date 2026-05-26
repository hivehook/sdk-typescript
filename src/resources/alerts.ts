import type { AlertRule, AlertChannel, EmailAlertConfig, SlackAlertConfig, PageInfo, ListOptions } from "../types.js";
import type { GraphQLTransport } from "../transport.js";

export interface CreateAlertRuleInput {
  name: string;
  conditionType: string;
  threshold: number;
  webhookUrl?: string;
  channel?: AlertChannel;
  emailConfig?: EmailAlertConfig;
  slackConfig?: SlackAlertConfig;
  cooldown?: string;
  enabled?: boolean;
}

export interface UpdateAlertRuleInput {
  name?: string;
  conditionType?: string;
  threshold?: number;
  webhookUrl?: string;
  channel?: AlertChannel;
  emailConfig?: EmailAlertConfig;
  slackConfig?: SlackAlertConfig;
  cooldown?: string;
  enabled?: boolean;
}

export interface ListAlertRulesOptions extends ListOptions {
  enabled?: boolean;
}

const ALERT_RULE_FRAGMENT = `
  id
  name
  conditionType
  threshold
  webhookUrl
  channel
  emailConfig { to subjectTemplate }
  slackConfig { webhookUrl channel }
  cooldown
  enabled
  createdAt
`;

const LIST_QUERY = `
  query ListAlertRules($enabled: Boolean, $search: String, $limit: Int, $offset: Int, $after: String, $first: Int) {
    alertRules(enabled: $enabled, search: $search, limit: $limit, offset: $offset, after: $after, first: $first) {
      nodes { ${ALERT_RULE_FRAGMENT} }
      pageInfo { total limit offset endCursor hasNextPage }
    }
  }
`;

const GET_QUERY = `
  query GetAlertRule($id: UUID!) {
    alertRule(id: $id) { ${ALERT_RULE_FRAGMENT} }
  }
`;

const CREATE_MUTATION = `
  mutation CreateAlertRule($input: CreateAlertRuleInput!) {
    createAlertRule(input: $input) { ${ALERT_RULE_FRAGMENT} }
  }
`;

const UPDATE_MUTATION = `
  mutation UpdateAlertRule($id: UUID!, $input: UpdateAlertRuleInput!) {
    updateAlertRule(id: $id, input: $input) { ${ALERT_RULE_FRAGMENT} }
  }
`;

const DELETE_MUTATION = `
  mutation DeleteAlertRule($id: UUID!) {
    deleteAlertRule(id: $id)
  }
`;

const TEST_MUTATION = `
  mutation TestAlertRule($id: UUID!) {
    testAlertRule(id: $id)
  }
`;

export class AlertRuleService {
  private transport: GraphQLTransport;

  constructor(transport: GraphQLTransport) {
    this.transport = transport;
  }

  async list(options?: ListAlertRulesOptions): Promise<{ nodes: AlertRule[]; pageInfo: PageInfo }> {
    const variables: Record<string, unknown> = {};
    if (options) {
      if (options.limit !== undefined) variables.limit = options.limit;
      if (options.offset !== undefined) variables.offset = options.offset;
      if (options.after !== undefined) variables.after = options.after;
      if (options.first !== undefined) variables.first = options.first;
      if (options.search !== undefined) variables.search = options.search;
      if (options.enabled !== undefined) variables.enabled = options.enabled;
    }
    const data = await this.transport.execute<{ alertRules: { nodes: AlertRule[]; pageInfo: PageInfo } }>(LIST_QUERY, variables);
    return data.alertRules;
  }

  async get(id: string): Promise<AlertRule | null> {
    const data = await this.transport.execute<{ alertRule: AlertRule | null }>(GET_QUERY, { id });
    return data.alertRule;
  }

  async create(input: CreateAlertRuleInput): Promise<AlertRule> {
    const data = await this.transport.execute<{ createAlertRule: AlertRule }>(CREATE_MUTATION, { input });
    return data.createAlertRule;
  }

  async update(id: string, input: UpdateAlertRuleInput): Promise<AlertRule> {
    const data = await this.transport.execute<{ updateAlertRule: AlertRule }>(UPDATE_MUTATION, { id, input });
    return data.updateAlertRule;
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ deleteAlertRule: boolean }>(DELETE_MUTATION, { id });
    return data.deleteAlertRule;
  }

  async test(id: string): Promise<boolean> {
    const data = await this.transport.execute<{ testAlertRule: boolean }>(TEST_MUTATION, { id });
    return data.testAlertRule;
  }
}
