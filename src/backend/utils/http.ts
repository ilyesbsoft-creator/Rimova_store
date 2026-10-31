
/**
 * HTTP response helpers
 */

/**
 * HTTP error that carries a status code and optional validation errors.
 */
export class HttpError extends Error {
  public readonly status: number;
  public readonly errors?: unknown;

  constructor(
    message: string,
    status = 500,
    errors?: unknown,
  ) {
    super(message);

    this.name = "HttpError";
    this.status = status;
    this.errors = errors;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Returns a successful JSON response.
 */
export function successResponse(
  data: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(
    {
      success: true,
      ...data,
    },
    { status },
  );
}

/**
 * Returns an error JSON response.
 */
export function errorResponse(
  message: string,
  status: number,
  errors?: unknown,
): Response {
  return Response.json(
    {
      success: false,
      message,
      ...(errors !== undefined ? { errors } : {}),
    },
    { status },
  );
}

/**
 * Reads and parses a JSON request body.
 */
export async function readJsonBody(
  request: Request,
): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(
      "Invalid JSON request body.",
      400,
    );
  }
}

/**
 * Converts an error into an HTTP response.
 */
export function getErrorResponse(
  error: unknown,
): Response {
  if (error instanceof HttpError) {
    return errorResponse(
      error.message,
      error.status,
      error.errors,
    );
  }

  // Support other application errors that expose
  // a status or statusCode property.
  if (
    error !== null &&
    typeof error === "object"
  ) {
    const err = error as {
      message?: unknown;
      status?: unknown;
      statusCode?: unknown;
      errors?: unknown;
    };

    const status =
      typeof err.status === "number"
        ? err.status
        : err.statusCode;

    if (
      typeof status === "number" &&
      Number.isInteger(status) &&
      status >= 400 &&
      status <= 599
    ) {
      return errorResponse(
        typeof err.message === "string"
          ? err.message
          : "Request failed.",
        status,
        err.errors,
      );
    }
  }

  // Do not expose unexpected internal errors.
  return errorResponse(
    "An unexpected error occurred.",
    500,
  );
}
