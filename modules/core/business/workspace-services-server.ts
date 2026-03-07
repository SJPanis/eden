import "server-only";

import { cookies } from "next/headers";
import {
  getMockWorkspaceServiceStates,
  mockWorkspaceServicesCookieName,
  parseMockWorkspaceServicesCookie,
} from "@/modules/core/business/mock-workspace-services";

export async function getMockWorkspaceServices() {
  const cookieStore = await cookies();
  return getMockWorkspaceServiceStates(
    parseMockWorkspaceServicesCookie(
      cookieStore.get(mockWorkspaceServicesCookieName)?.value,
    ),
  );
}
