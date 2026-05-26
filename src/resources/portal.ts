import type { GraphQLTransport } from "../transport.js";

export interface PortalToken {
  token: string;
  expiresAt: string;
}

const GENERATE_TOKEN_MUTATION = `
  mutation GeneratePortalToken($applicationId: UUID!) {
    generatePortalToken(applicationId: $applicationId) {
      token
      expiresAt
    }
  }
`;

export class PortalService {
  constructor(private transport: GraphQLTransport) {}

  async generateToken(applicationId: string): Promise<PortalToken> {
    const data = await this.transport.execute<{
      generatePortalToken: PortalToken;
    }>(GENERATE_TOKEN_MUTATION, { applicationId });
    return data.generatePortalToken;
  }
}
