export class HivehookError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "HivehookError";
  }
}

export interface GraphQLErrorDetail {
  message: string;
  extensions?: { code?: string; [key: string]: unknown };
  [key: string]: unknown;
}

export class APIError extends HivehookError {
  statusCode?: number;
  graphqlErrors?: GraphQLErrorDetail[];

  constructor(
    message: string,
    statusCode?: number,
    graphqlErrors?: GraphQLErrorDetail[],
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "APIError";
    this.statusCode = statusCode;
    this.graphqlErrors = graphqlErrors;
  }
}

export class NotFoundError extends HivehookError {
  graphqlErrors?: GraphQLErrorDetail[];

  constructor(
    message: string,
    graphqlErrors?: GraphQLErrorDetail[],
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "NotFoundError";
    this.graphqlErrors = graphqlErrors;
  }
}

export class ConflictError extends HivehookError {
  graphqlErrors?: GraphQLErrorDetail[];

  constructor(
    message: string,
    graphqlErrors?: GraphQLErrorDetail[],
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "ConflictError";
    this.graphqlErrors = graphqlErrors;
  }
}

export class AuthError extends HivehookError {
  statusCode: number;
  graphqlErrors?: GraphQLErrorDetail[];

  constructor(
    message: string,
    statusCode = 401,
    graphqlErrors?: GraphQLErrorDetail[],
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "AuthError";
    this.statusCode = statusCode;
    this.graphqlErrors = graphqlErrors;
  }
}

export class ValidationError extends HivehookError {
  graphqlErrors?: GraphQLErrorDetail[];

  constructor(
    message: string,
    graphqlErrors?: GraphQLErrorDetail[],
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "ValidationError";
    this.graphqlErrors = graphqlErrors;
  }
}

export class RateLimitError extends HivehookError {
  statusCode: number;
  retryAfterMs?: number;
  graphqlErrors?: GraphQLErrorDetail[];

  constructor(
    message: string,
    statusCode = 429,
    retryAfterMs?: number,
    graphqlErrors?: GraphQLErrorDetail[],
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "RateLimitError";
    this.statusCode = statusCode;
    this.retryAfterMs = retryAfterMs;
    this.graphqlErrors = graphqlErrors;
  }
}

export class ServerError extends HivehookError {
  statusCode: number;
  graphqlErrors?: GraphQLErrorDetail[];

  constructor(
    message: string,
    statusCode: number,
    graphqlErrors?: GraphQLErrorDetail[],
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "ServerError";
    this.statusCode = statusCode;
    this.graphqlErrors = graphqlErrors;
  }
}
