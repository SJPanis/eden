import { NextResponse } from "next/server";
import {
  describeProjectRuntimeFailure,
  registerOwnerInternalSandboxRuntime,
} from "@/modules/core/services";
import { getServerSession } from "@/modules/core/session/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
  };
  const session = await getServerSession();

  if (session.role !== "owner") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only the Eden owner can manage project runtimes.",
      },
      { status: 403 },
    );
  }

  const action = body.action?.trim();

  if (action !== "initialize_internal_sandbox") {
    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported owner runtime action.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await registerOwnerInternalSandboxRuntime({
      id: session.user.id,
      username: session.user.username,
      displayName: session.user.displayName,
      role: session.user.role,
      status: session.user.status,
      edenBalanceCredits: session.user.edenBalanceCredits,
    });

    return NextResponse.json({
      ok: true,
      action,
      created: result.created,
      runtime: result.runtime,
    });
  } catch (error) {
    const detail = describeProjectRuntimeFailure(error);
    console.error(`[eden][owner-project-runtimes] ${detail}`);

    return NextResponse.json(
      {
        ok: false,
        error: detail,
      },
      { status: 503 },
    );
  }
}
