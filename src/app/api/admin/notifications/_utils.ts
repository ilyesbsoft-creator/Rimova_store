
import { ZodError } from "zod";
import type { NextRequest } from "next/server";

export class InvalidJsonBodyError extends Error {
  constructor() {
    super("Request body must contain valid JSON.");
    this.name = "InvalidJsonBodyError";
  }
}

export async function readJsonBody(
  request: NextRequest,
): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new InvalidJsonBodyError();
  }
}

export function handleApiError(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      {
        success: false,
        message: "Validation failed.",
        errors: error.issues,
      },
      { status: 400 },
    );
  }

  if (error instanceof InvalidJsonBodyError) {
    return Response.json(
      {
        success: false,
        message: error.message,
      },
      { status: 400 },
    );
  }

  const apiError = error as {
    status?: unknown;
    statusCode?: unknown;
    message?: unknown;
    code?: unknown;
  } | null;

  const status =
    typeof apiError?.statusCode === "number"
      ? apiError.statusCode
      : typeof apiError?.status === "number"
        ? apiError.status
        : 500;

  if (Number.isInteger(status) && status >= 400 && status < 500) {
    return Response.json(
      {
        success: false,
        message:
          typeof apiError?.message === "string"
            ? apiError.message
            : "The request could not be completed.",
        ...(typeof apiError?.code === "string"
          ? { code: apiError.code }
          : {}),
      },
      { status },
    );
  }

  console.error("[Admin Notifications API]", error);

  return Response.json(
    {
      success: false,
      message: "Internal server error.",
    },
    { status: 500 },
  );
}
