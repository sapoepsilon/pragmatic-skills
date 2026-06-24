// Mobile auto-shipper state machine — pure reducer, no IO/LLM/devices.
// Encodes the stage flow + bounce edges:
//   analyze ─(confirm_intent)─► implement ⇄ qa ─(confirm_done)─► done
//   bounces: qa fail → implement | implement stuck → analyze | analyze stuck → dev (gate)
// This is the deterministic core the verification plan says to test hard.

export const STAGES = ["analyze", "implement", "qa", "ship", "done", "failed"];

const PROD = /prod|production/i;
export class ProdGuardError extends Error {}

// Default-deny prod. Only an explicit allowProd:true (and a non-"production" env) passes.
export function assertNotProd(qa = {}) {
  if (String(qa.environment).toLowerCase() === "production")
    throw new ProdGuardError("QA environment is 'production' — refusing.");
  if (qa.allowProd === true) return;
  for (const [field, value] of Object.entries({ host: qa.host, db: qa.db, url: qa.url, environment: qa.environment }))
    if (value && PROD.test(String(value)))
      throw new ProdGuardError(`QA ${field} ("${value}") looks like prod — set allowProd:true only if it truly is not.`);
}

export function initRun({ requestId, source, text, config = {} }) {
  return {
    requestId,
    source, // { channel, chat, ... }
    text,
    config,
    stage: "analyze",
    gate: null, // { awaiting: 'confirm_intent' | 'confirm_done' | 'clarify', ... }
    skipQa: config.skipQa === true,
    intent: null, // { confirmed, summary, findings, feedback }
    iterations: 0, // implement<->qa bounce count
    maxIterations: config.maxIterations ?? 5,
    qa: null, // { pass, report, recording }
    ship: null, // { branch, prUrl, installed }
    status: "running", // running | awaiting | done | failed
    reason: null,
    history: [],
  };
}

function step(run, event) {
  run.history = [...run.history, { from: run.stage, gate: run.gate?.awaiting ?? null, event: event.type }];
}

function fail(run, reason) {
  return Object.assign(run, { stage: "failed", status: "failed", reason, gate: null });
}

function overBudget(run) {
  return run.iterations >= run.maxIterations;
}

// next(run, event) -> new run. Terminal runs ignore further events.
export function next(prev, event) {
  const run = structuredClone(prev);
  step(run, event);
  if (run.status === "done" || run.status === "failed") return run;

  switch (event.type) {
    case "analyzed": {
      run.intent = { confirmed: false, ...event.payload };
      run.gate = { awaiting: "confirm_intent", summary: event.payload?.summary, screenshot: event.payload?.screenshot };
      run.status = "awaiting";
      return run;
    }

    // analyze cannot resolve the ambiguity itself → ask the dev (stage 1 bounces UP to dev).
    case "analyze_stuck": {
      if (run.stage !== "analyze") return run;
      run.gate = { awaiting: "clarify", question: event.payload?.question };
      run.status = "awaiting";
      return run;
    }

    case "human_reply": {
      if (!run.gate) return run;
      const approve = event.payload?.approve === true;
      const feedback = event.payload?.feedback ?? null;
      const at = run.gate.awaiting;

      if (at === "confirm_intent") {
        if (approve) Object.assign(run, { stage: "implement", status: "running", gate: null, intent: { ...run.intent, confirmed: true } });
        else Object.assign(run, { stage: "analyze", status: "running", gate: null, intent: { ...run.intent, feedback } });
        return run;
      }
      if (at === "clarify") {
        // dev answered the analyze question → keep analyzing with the answer.
        Object.assign(run, { stage: "analyze", status: "running", gate: null, intent: { ...(run.intent ?? {}), feedback } });
        return run;
      }
      if (at === "confirm_done") {
        if (approve) Object.assign(run, { stage: "done", status: "done", gate: null });
        else Object.assign(run, { stage: "implement", status: "running", gate: null, intent: { ...run.intent, feedback } });
        return run;
      }
      return run;
    }

    case "implemented": {
      if (run.stage !== "implement") return run;
      run.ship = { ...(run.ship ?? {}), branch: event.payload?.branch ?? run.ship?.branch ?? null };
      run.stage = run.skipQa ? "ship" : "qa";
      return run;
    }

    // implement can't proceed without a product decision → bounce DOWN to analyze (stage 2 → stage 1).
    case "implement_stuck": {
      if (run.stage !== "implement") return run;
      Object.assign(run, { stage: "analyze", intent: { ...(run.intent ?? {}), feedback: event.payload?.question ?? null } });
      return run;
    }

    case "qa_result": {
      if (run.stage !== "qa") return run;
      const pass = event.payload?.pass === true;
      run.qa = { pass, report: event.payload?.report ?? null, recording: event.payload?.recording ?? null };
      if (pass) {
        run.stage = "ship";
        return run;
      }
      run.iterations += 1; // qa fail → bounce to implement (stage 3 → stage 2)
      if (overBudget(run)) return fail(run, `QA failed ${run.iterations}× (max ${run.maxIterations}) — stopping before an infinite loop.`);
      run.stage = "implement";
      return run;
    }

    case "shipped": {
      if (run.stage !== "ship") return run;
      run.ship = { ...(run.ship ?? {}), prUrl: event.payload?.prUrl ?? null, installed: event.payload?.installed ?? false };
      run.gate = { awaiting: "confirm_done", prUrl: run.ship.prUrl, recording: run.qa?.recording ?? null };
      run.status = "awaiting";
      return run;
    }

    case "abort":
      return fail(run, event.payload?.reason ?? "aborted");

    default:
      return run;
  }
}
