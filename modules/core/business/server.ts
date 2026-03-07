import "server-only";

import { cookies } from "next/headers";
import {
  getMockCreatedBusinessState,
  mockCreatedBusinessCookieName,
  parseMockCreatedBusinessCookie,
} from "@/modules/core/business/mock-created-business";

export async function getMockCreatedBusiness() {
  const cookieStore = await cookies();
  return getMockCreatedBusinessState(
    parseMockCreatedBusinessCookie(cookieStore.get(mockCreatedBusinessCookieName)?.value),
  );
}
