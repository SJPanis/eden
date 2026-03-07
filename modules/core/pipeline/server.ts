import "server-only";

import { cookies } from "next/headers";
import {
  getEffectivePipelineEvents,
  mockPipelineCookieName,
  mockPipelineEventsCookieName,
  parseMockPipelineCookie,
  parseMockPipelineEventsCookie,
} from "@/modules/core/pipeline/mock-pipeline";

export async function getMockPipelineRecords() {
  const cookieStore = await cookies();
  return parseMockPipelineCookie(cookieStore.get(mockPipelineCookieName)?.value);
}

export async function getMockPipelineEvents() {
  const cookieStore = await cookies();
  const storedEvents = parseMockPipelineEventsCookie(
    cookieStore.get(mockPipelineEventsCookieName)?.value,
  );

  return getEffectivePipelineEvents(storedEvents);
}
