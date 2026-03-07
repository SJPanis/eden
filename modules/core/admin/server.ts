import "server-only";

import { cookies } from "next/headers";
import {
  getEffectiveMockAdminState,
  mockAdminStateCookieName,
  parseMockAdminStateCookie,
} from "@/modules/core/admin/mock-admin-state";

export async function getMockAdminState() {
  const cookieStore = await cookies();
  return getEffectiveMockAdminState(
    parseMockAdminStateCookie(cookieStore.get(mockAdminStateCookieName)?.value),
  );
}
