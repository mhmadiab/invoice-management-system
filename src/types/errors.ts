export type ErrorKind = "validation" | "unauthorized" | "forbidden" | "not_found" | "conflict" | "locked" | "unprocessable";
export type FieldError = { field: string; message: string };

export class ApplicationError extends Error {
  constructor(
    readonly kind: ErrorKind,
    readonly code: string,
    message: string,
    readonly fields?: FieldError[],
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export function invalid(field: string, message: string): never {
  throw new ApplicationError("validation", "VALIDATION_ERROR", "The request contains invalid data.", [{ field, message }]);
}

export function conflict(code: string, message: string): never {
  throw new ApplicationError("conflict", code, message);
}

export function required<T>(value: T | null | undefined, resource: string): T {
  if (value == null) {
    throw new ApplicationError("not_found", `${resource.toUpperCase()}_NOT_FOUND`, `${resource[0].toUpperCase()}${resource.slice(1)} was not found.`);
  }
  return value;
}
