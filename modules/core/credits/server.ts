import "server-only";

import { cookies } from "next/headers";
import { mockTransactionsCookieName, parseMockTransactionsCookie } from "@/modules/core/credits/mock-credits";

export async function getSimulatedTransactions() {
  const cookieStore = await cookies();
  return parseMockTransactionsCookie(cookieStore.get(mockTransactionsCookieName)?.value);
}
