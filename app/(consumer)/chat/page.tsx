import { getServerSession } from "@/modules/core/session/server";
import { EdenChatPanel } from "@/ui/chat/eden-chat-panel";

type ChatPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const [session, params] = await Promise.all([getServerSession(), searchParams]);
  const canUseAi = session.auth.source === "persistent";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#14989a]">Eden AI</p>
          <h1 className="mt-0.5 text-xl font-bold text-white">Chat</h1>
        </div>
        <p className="text-sm text-white/30">Ideas you build here carry into your workspace.</p>
      </div>
      <EdenChatPanel initialPrompt={params.q} canUseAi={canUseAi} />
    </div>
  );
}
