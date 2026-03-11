import "server-only";

import type { EdenAiProjectArtifact } from "@/modules/eden-ai/types";

export function buildBusinessCreationHref(projectArtifact: EdenAiProjectArtifact) {
  const searchParams = new URLSearchParams({
    source: "ask_eden",
    ideaTitle: projectArtifact.title,
    ideaDescription: projectArtifact.description,
  });

  return `/business/create?${searchParams.toString()}`;
}
