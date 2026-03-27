interface EvalFeedback {
  evaluatedAt: string;
  promoted: string[];
  rejected: string[];
  pattern: string;
  encouragement: string;
  artistRunsSinceLastEval: number;
}

interface ArtistRun {
  runAt: string;
  ideas: string[];
  buildIds: string[];
}

// In-memory state (survives per deployment, resets on redeploy)
let architectLastFeedback: EvalFeedback | null = null;
let artistRunsSinceEval: ArtistRun[] = [];
let artistSchedulerStarted = false;
let architectSchedulerStarted = false;
let artistLastRunAt: string | null = null;
let artistSchedulerStartedAt: number | null = null;
let architectSchedulerStartedAt: number | null = null;

export function getArchitectFeedback(): EvalFeedback | null {
  return architectLastFeedback;
}

export function setArchitectFeedback(feedback: EvalFeedback) {
  architectLastFeedback = feedback;
  artistRunsSinceEval = [];
}

export function recordArtistRun(run: ArtistRun) {
  artistRunsSinceEval.push(run);
  artistLastRunAt = run.runAt;
}

export function getArtistRunsSinceEval(): ArtistRun[] {
  return artistRunsSinceEval;
}

export function getLoopStatus() {
  const now = Date.now();

  const artistNextIn = artistSchedulerStartedAt
    ? Math.max(0, 30 * 60 * 1000 - ((now - artistSchedulerStartedAt) % (30 * 60 * 1000)))
    : 0;
  const architectNextIn = architectSchedulerStartedAt
    ? Math.max(0, 2 * 60 * 60 * 1000 - ((now - architectSchedulerStartedAt) % (2 * 60 * 60 * 1000)))
    : 0;

  return {
    artist: {
      runsThisCycle: artistRunsSinceEval.length,
      nextRunIn: artistSchedulerStarted ? `${Math.round(artistNextIn / 60000)} minutes` : "not started",
      lastRunAt: artistLastRunAt,
    },
    architect: {
      lastEvaluatedAt: architectLastFeedback?.evaluatedAt ?? null,
      nextEvalIn: architectSchedulerStarted ? `${Math.round(architectNextIn / 3600000 * 10) / 10} hours` : "not started",
      lastPattern: architectLastFeedback?.pattern ?? null,
      lastEncouragement: architectLastFeedback?.encouragement ?? null,
      promotedCount: architectLastFeedback?.promoted.length ?? 0,
    },
    loopHealth: artistSchedulerStarted && architectSchedulerStarted
      ? "active" as const
      : artistSchedulerStarted || architectSchedulerStarted
        ? "starting" as const
        : "idle" as const,
  };
}

export function startArtistScheduler(baseUrl: string) {
  if (artistSchedulerStarted) return;
  artistSchedulerStarted = true;
  artistSchedulerStartedAt = Date.now();
  console.log("[artist] Scheduler starting — runs every 30 minutes");

  const runArtist = async () => {
    try {
      const feedback = getArchitectFeedback();
      const context = feedback
        ? `Architect's last evaluation:\nPattern: ${feedback.pattern}\nEncouragement: ${feedback.encouragement}\nWhat worked: ${feedback.promoted.join(", ")}\nWhat didn't: ${feedback.rejected.join(", ")}\nBuild services that match the pattern above.`
        : "First run — explore freely. Build a useful AI service for Eden users.";

      const res = await fetch(`${baseUrl}/api/agents/artist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: context, source: "scheduler" }),
      });
      const data = await res.json();
      console.log("[artist] Run complete:", data?.buildId);

      if (data?.buildId) {
        recordArtistRun({
          runAt: new Date().toISOString(),
          ideas: [data?.request || "unknown"],
          buildIds: [data.buildId],
        });
      }
    } catch (e) {
      console.error("[artist] Run failed:", e);
    }
  };

  setTimeout(runArtist, 5 * 60 * 1000);
  setInterval(runArtist, 30 * 60 * 1000);
}

export function startArchitectScheduler(baseUrl: string) {
  if (architectSchedulerStarted) return;
  architectSchedulerStarted = true;
  architectSchedulerStartedAt = Date.now();
  console.log("[architect] Scheduler starting — evaluates every 2 hours");

  const runArchitect = async () => {
    const runs = getArtistRunsSinceEval();
    if (runs.length === 0) {
      console.log("[architect] No Artist runs to evaluate yet");
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/api/agents/architect/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistRuns: runs, source: "scheduler" }),
      });
      const data = await res.json();
      console.log("[architect] Evaluation complete:", data?.feedback?.pattern);
    } catch (e) {
      console.error("[architect] Evaluation failed:", e);
    }
  };

  setTimeout(runArchitect, 2 * 60 * 60 * 1000);
  setInterval(runArchitect, 2 * 60 * 60 * 1000);
}
