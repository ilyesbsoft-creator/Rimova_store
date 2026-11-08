
"use client";

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => null);

  // Handle invalid or expired admin session.
  if (
    response.status === 401 &&
    payload?.message === "Invalid or expired session."
  ) {
    window.location.replace("/admin/login");

    throw new Error("Invalid or expired session.");
  }

  if (!response.ok) {
    const fieldErrors = payload?.errors?.fieldErrors;

    const details =
      fieldErrors && typeof fieldErrors === "object"
        ? Object.entries(fieldErrors)
            .map(
              ([field, messages]) =>
                `${field}: ${
                  Array.isArray(messages)
                    ? messages.join(", ")
                    : String(messages)
                }`,
            )
            .join(" | ")
        : "";

    const message =
      payload?.message ||
      payload?.error?.message ||
      "حدث خطأ أثناء تنفيذ العملية.";

    throw new Error(details ? `${message} (${details})` : message);
  }

  return payload as T;
}
