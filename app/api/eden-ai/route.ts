import { NextResponse } from "next/server";
import { routeEdenAiRequest } from "@/modules/eden-ai/router";
import { parseEdenAiRequestBody } from "@/modules/eden-ai/schema";
import { buildEdenAiToolContext } from "@/modules/eden-ai/tool-registry";
import { getServerSession } from "@/modules/core/session/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const session = await getServerSession();

    if (session.auth.source !== "persistent") {
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication is required before Ask Eden can inspect live platform state.",
        },
        { status: 401 },
      );
    }

    const edenAiRequest = parseEdenAiRequestBody(body);
    const context = await buildEdenAiToolContext(session);
    const result = await routeEdenAiRequest(edenAiRequest, context);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown Ask Eden routing failure";

    return NextResponse.json(
      {
        ok: false,
        error: detail,
      },
      { status: 400 },
    );
  }
}
