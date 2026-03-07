import { ConsumerHomePanel } from "@/ui/consumer/consumer-home";
import { getMockCreatedBusiness } from "@/modules/core/business/server";
import { getMockWorkspaceServices } from "@/modules/core/business/workspace-services-server";
import { buildDiscoverySnapshot } from "@/modules/core/mock-data";
import { getMockPipelineRecords } from "@/modules/core/pipeline/server";
import { getMockSession } from "@/modules/core/session/server";

export default async function ConsumerPage() {
  const [session, pipelineRecords, createdBusiness, workspaceServices] = await Promise.all([
    getMockSession(),
    getMockPipelineRecords(),
    getMockCreatedBusiness(),
    getMockWorkspaceServices(),
  ]);
  const discoverySnapshot = buildDiscoverySnapshot({
    pipelineRecords,
    createdBusiness,
    workspaceServices,
  });

  return <ConsumerHomePanel session={session} discoverySnapshot={discoverySnapshot} />;
}
