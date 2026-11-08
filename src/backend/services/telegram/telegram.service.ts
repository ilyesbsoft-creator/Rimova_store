
type TelegramApiResponse = {
  ok: boolean;
  description?: string;
  result?: {
    message_id: number;
    chat: {
      id: number;
    };
  };
};

export type TelegramSendResult =
  | {
      ok: true;
      result: {
        chatId: string;
        messageId: number;
      };
    }
  | {
      ok: false;
      error: string;
    };

const TELEGRAM_API_BASE_URL = "https://api.telegram.org";
const TELEGRAM_REQUEST_TIMEOUT = 10_000;
const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

/**
 * Sends a text message using Telegram Bot API.
 *
 * Throws an error when the Telegram request fails.
 */
export async function sendTelegramMessage(
  chatId: string,
  message: string,
): Promise<{
  chatId: string;
  messageId: number;
}> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }

  if (!chatId || !chatId.trim()) {
    throw new Error("Telegram chat ID is required.");
  }

  if (!message || !message.trim()) {
    throw new Error("Telegram message cannot be empty.");
  }

  if (message.length > TELEGRAM_MAX_MESSAGE_LENGTH) {
    throw new Error(
      `Telegram message exceeds the ${TELEGRAM_MAX_MESSAGE_LENGTH} character limit.`,
    );
  }

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    TELEGRAM_REQUEST_TIMEOUT,
  );

  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE_URL}/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId.trim(),
          text: message,
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
        cache: "no-store",
      },
    );

    let data: TelegramApiResponse;

    try {
      data = (await response.json()) as TelegramApiResponse;
    } catch {
      throw new Error("Telegram returned an invalid response.");
    }

    if (!response.ok || !data.ok || !data.result) {
      throw new Error(
        data.description ||
          `Telegram API request failed with status ${response.status}.`,
      );
    }

    return {
      chatId: String(data.result.chat.id),
      messageId: data.result.message_id,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Safely sends a Telegram message.
 *
 * Returns an error result instead of throwing.
 * This prevents Telegram failures from affecting
 * the main application workflow.
 */
export async function sendTelegramMessageSafely(
  chatId: string,
  message: string,
): Promise<TelegramSendResult> {
  try {
    const result = await sendTelegramMessage(chatId, message);

    return {
      ok: true,
      result,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.name === "AbortError"
          ? "Telegram request timed out."
          : error.message
        : "Unknown Telegram error.";

    return {
      ok: false,
      error: errorMessage,
    };
  }
}
