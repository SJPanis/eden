interface EvalFeedback {
  evaluatedAt: string;
  promoted: string[];
  rejected: string[];
  pattern: string;
  encouragement: string;
  adamRunsSinceLastEval: number;
}

interface AdamRun {
  runAt: string;
  ideas: string[];
  buildIds: string[];
}

// In-memory state (survives per deployment, resets on redeploy)
let eveLastFeedback: EvalFeedback | null = null;
let adamRunsSinceEval: AdamRun[] = [];
let adamSchedulerStarted = false;
let eveSchedulerStarted = false;
let adamLastRunAt: string | null = null;
let adamSchedulerStartedAt: number | null = null;
let eveSchedulerStartedAt: number | null = null;

export function getEveFeedback(): EvalFeedback | null {
  return eveLastFeedback;
}

export function setEveFeedback(feedback: EvalFeedback) {
  eveLastFeedback = feedback;
  adamRunsSinceEval = [];
}

export function recordAdamRun(run: AdamRun) {
  adamRunsSinceEval.push(run);
  adamLastRunAt = run.runAt;
}

export function getAdamRunsSinceEval(): AdamRun[] {
  return adamRunsSinceEval;
}

export function getLoopStatus() {
  const now = Date.now();

  const adamNextIn = adamSchedulerStartedAt
    ? Math.max(0, 30 * 60 * 1000 - ((now - adamSchedulerStartedAt) % (30 * 60 * 1000)))
    : 0;
  const eveNextIn = eveSchedulerStartedAt
    ? Math.max(0, 2 * 60 * 60 * 1000 - ((now - eveSchedulerStartedAt) % (2 * 60 * 60 * 1000)))
    : 0;

  return {
    adam: {
      runsThisCycle: adamRunsSinceEval.length,
      nextRunIn: adamSchedulerStarted ? `${Math.round(adamNextIn / 60000)} minutes` : "not started",
      lastRunAt: adamLastRunAt,
    },
    eve: {
      lastEvaluatedAt: eveLastFeedback?.evaluatedAt ?? null,
      nextEvalIn: eveSchedulerStarted ? `${Math.round(eveNextIn / 3600000 * 10) / 10} hours` : "not started",
      lastPattern: eveLastFeedback?.pattern ?? null,
      lastEncouragement: eveLastFeedback?.encouragement ?? null,
      promotedCount: eveLastFeedback?.promoted.length ?? 0,
    },
    loopHealth: adamSchedulerStarted && eveSchedulerStarted
      ? "active" as const
      : adamSchedulerStarted || eveSchedulerStarted
        ? "starting" as const
        : "idle" as const,
  };
}

export function startAdamScheduler(baseUrl: string) {
  if (adamSchedulerStarted) return;
  adamSchedulerStarted = true;
  adamSchedulerStartedAt = Date.now();
  console.log("[artist] Scheduler starting — runs every 5 minutes");

  const runAdam = async () => {
    try {
      const feedback = getEveFeedback();
      const context = feedback
        ? `Eve's last evaluation:\nPattern: ${feedback.pattern}\nEncouragement: ${feedback.encouragement}\nWhat worked: ${feedback.promoted.join(", ")}\nWhat didn't: ${feedback.rejected.join(", ")}\nBuild services that match the pattern above.`
        : "First run — explore freely. Build a useful AI service for Eden users.";

      const res = await fetch(`${baseUrl}/api/agents/adam`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: context, source: "scheduler" }),
      });
      const data = await res.json();
      console.log("[adam] Run complete:", data?.buildId);

      if (data?.buildId) {
        recordAdamRun({
          runAt: new Date().toISOString(),
          ideas: [data?.request || "unknown"],
          buildIds: [data.buildId],
        });
      }
    } catch (e) {
      console.error("[adam] Run failed:", e);
    }
  };

  // First run after 2 minutes, then every 5 minutes
  setTimeout(runAdam, 2 * 60 * 1000);
  setInterval(runAdam, 5 * 60 * 1000);
}

export function startEveScheduler(baseUrl: string) {
  if (eveSchedulerStarted) return;
  eveSchedulerStarted = true;
  eveSchedulerStartedAt = Date.now();
  console.log("[eve] Scheduler starting — evaluates every 2 hours");

  const runEve = async () => {
    const runs = getAdamRunsSinceEval();
    if (runs.length === 0) {
      console.log("[eve] No Adam runs to evaluate yet");
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/api/agents/eve/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adamRuns: runs, source: "scheduler" }),
      });
      const data = await res.json();
      console.log("[eve] Evaluation complete:", data?.feedback?.pattern);
    } catch (e) {
      console.error("[eve] Evaluation failed:", e);
    }
  };

  // First evaluation after 2 hours
  setTimeout(runEve, 2 * 60 * 60 * 1000);
  // Then every 2 hours
  setInterval(runEve, 2 * 60 * 60 * 1000);
}
