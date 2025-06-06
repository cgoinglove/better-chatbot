/**
 * Simple custom error classes
 */

export class AppError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

// 401 Unauthorized Error
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message);
    this.name = "UnauthorizedError";
  }
}

// 403 Forbidden Error
export class ForbiddenError extends AppError {
  constructor(message = "Access forbidden") {
    super("FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}
