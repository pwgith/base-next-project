/**
 * Application error classes.
 * The API route handler maps these to HTTP status codes — see the
 * error handling table in architecture.instructions.md.
 */

export class ValidationError extends Error {
  public readonly fields: Record<string, string>;

  constructor(message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ValidationError";
    this.fields = fields ?? {};
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export class ConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConcurrencyError";
  }
}

export class AuthorisationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorisationError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ExternalServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalServiceError";
  }
}
