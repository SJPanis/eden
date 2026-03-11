import type {
  EdenAiActionRequest,
  EdenAiRequest,
  EdenAiSelectedContext,
} from "@/modules/eden-ai/types";

function asTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function asOptionalContext(value: unknown): EdenAiSelectedContext | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const input = value as Record<string, unknown>;
  const context: EdenAiSelectedContext = {};

  const businessId = asTrimmedString(input.businessId);
  const projectId = asTrimmedString(input.projectId);
  const agentId = asTrimmedString(input.agentId);
  const serviceId = asTrimmedString(input.serviceId);

  if (businessId) {
    context.businessId = businessId;
  }

  if (projectId) {
    context.projectId = projectId;
  }

  if (agentId) {
    context.agentId = agentId;
  }

  if (serviceId) {
    context.serviceId = serviceId;
  }

  return Object.keys(context).length > 0 ? context : undefined;
}

function asOptionalAction(value: unknown): EdenAiActionRequest | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const input = value as Record<string, unknown>;
  const type = asTrimmedString(input.type);

  if (!type) {
    return undefined;
  }

  const action: EdenAiActionRequest = {
    type: type as EdenAiActionRequest["type"],
  };
  const targetId = asTrimmedString(input.targetId);

  if (targetId) {
    action.targetId = targetId;
  }

  if (input.payload && typeof input.payload === "object" && !Array.isArray(input.payload)) {
    action.payload = input.payload as Record<string, unknown>;
  }

  return action;
}

export function parseEdenAiRequestBody(value: unknown): EdenAiRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A prompt payload is required.");
  }

  const input = value as Record<string, unknown>;
  const prompt = asTrimmedString(input.prompt);

  if (!prompt) {
    throw new Error("Prompt is required.");
  }

  return {
    prompt,
    selectedContext: asOptionalContext(input.selectedContext),
    requestedAction: asOptionalAction(input.requestedAction),
  };
}
