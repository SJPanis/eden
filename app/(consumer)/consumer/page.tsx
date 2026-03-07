import { ConsumerHomePanel } from "@/ui/consumer/consumer-home";
import { getMockCreatedBusiness } from "@/modules/core/business/server";
import { getMockWorkspaceServices } from "@/modules/core/business/workspace-services-server";
import { getMockPipelineRecords } from "@/modules/core/pipeline/server";
import { getMockSession } from "@/modules/core/session/server";
import { loadDiscoverySnapshot } from "@/modules/core/services";

export default async function ConsumerPage() {
  const [session, pipelineRecords, createdBusiness, workspaceServices] = await Promise.all([
    getMockSession(),
    getMockPipelineRecords(),
    getMockCreatedBusiness(),
    getMockWorkspaceServices(),
  ]);
  const discoverySnapshot = await loadDiscoverySnapshot({
    pipelineRecords,
    createdBusiness,
    workspaceServices,
  });

  return <ConsumerHomePanel session={session} discoverySnapshot={discoverySnapshot} />;
}
