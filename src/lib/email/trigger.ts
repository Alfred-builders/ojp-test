import type { SendEmailRequest } from "@/types/email";

/**
 * Fire-and-forget email trigger from client components.
 * Calls the API route without blocking the UI.
 */
export function triggerEmail(params: SendEmailRequest): void {
  fetch("/api/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  }).catch((err) => {
    console.error("[email] Failed to trigger notification:", err);
  });
}
