import "server-only";

import { cookies } from "next/headers";
import {
  mockBusinessAssistantHistoryCookieName,
  parseMockBusinessAssistantHistoryCookie,
} from "@/modules/core/assistant/mock-business-assistant-history";

export async function getMockBusinessAssistantHistory() {
  const cookieStore = await cookies();

  return parseMockBusinessAssistantHistoryCookie(
    cookieStore.get(mockBusinessAssistantHistoryCookieName)?.value,
  );
}
