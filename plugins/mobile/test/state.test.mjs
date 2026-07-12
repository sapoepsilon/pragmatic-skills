// Run: node plugins/mobile/test/state.test.mjs
// Asserts the state machine's transitions, bounce edges, termination, and prod guard.
import assert from "node:assert/strict";
import { initRun, next, assertNotProd, ProdGuardError } from "../lib/state.mjs";

const start = (config = {}) => initRun({ requestId: "r1", source: { channel: "telegram", chat: "1" }, text: "wider sidebar", config });
const reply = (approve, feedback) => ({ type: "human_reply", payload: { approve, feedback } });
let run;

// happy path: analyze -> confirm -> implement -> qa pass -> ship -> confirm -> done
run = start();
assert.equal(run.stage, "analyze");
run = next(run, { type: "analyzed", payload: { summary: "make it wider", findings: [] } });
assert.equal(run.gate.awaiting, "confirm_intent");
assert.equal(run.status, "awaiting");
run = next(run, reply(true));
assert.equal(run.stage, "implement");
assert.equal(run.intent.confirmed, true);
run = next(run, { type: "implemented", payload: { branch: "autoship/wider" } });
assert.equal(run.stage, "qa");
assert.equal(run.ship.branch, "autoship/wider");
run = next(run, { type: "qa_result", payload: { pass: true, recording: "/rec.mp4" } });
assert.equal(run.stage, "ship");
run = next(run, { type: "shipped", payload: { prUrl: "http://pr/1" } });
assert.equal(run.gate.awaiting, "confirm_done");
run = next(run, reply(true));
assert.equal(run.stage, "done");
assert.equal(run.status, "done");

// terminal: further events ignored
const after = next(run, { type: "implemented", payload: {} });
assert.equal(after.stage, "done");

// intent correction loops back to analyze
run = start();
run = next(run, { type: "analyzed", payload: { summary: "x" } });
run = next(run, reply(false, "no, the left nav"));
assert.equal(run.stage, "analyze");
assert.equal(run.intent.feedback, "no, the left nav");

// qa fail bounces to implement and counts
run = start({ maxIterations: 3 });
run = next(run, { type: "analyzed", payload: {} });
run = next(run, reply(true));
run = next(run, { type: "implemented", payload: { branch: "b" } });
run = next(run, { type: "qa_result", payload: { pass: false, report: "crash" } });
assert.equal(run.stage, "implement");
assert.equal(run.iterations, 1);

// qa keeps failing -> terminate at maxIterations, never loops forever
run = start({ maxIterations: 2 });
run = next(run, { type: "analyzed", payload: {} });
run = next(run, reply(true));
for (let i = 0; i < 5; i++) {
  if (run.stage !== "implement") break;
  run = next(run, { type: "implemented", payload: { branch: "b" } });
  run = next(run, { type: "qa_result", payload: { pass: false } });
}
assert.equal(run.stage, "failed");
assert.match(run.reason, /infinite loop/);

// skipQa routes implement straight to ship
run = start({ skipQa: true });
run = next(run, { type: "analyzed", payload: {} });
run = next(run, reply(true));
run = next(run, { type: "implemented", payload: { branch: "b" } });
assert.equal(run.stage, "ship");

// analyze_stuck opens a clarify gate to the dev; answer resumes analyze
run = start();
run = next(run, { type: "analyze_stuck", payload: { question: "which screen?" } });
assert.equal(run.gate.awaiting, "clarify");
assert.equal(run.status, "awaiting");
run = next(run, reply(null, "the profile screen"));
assert.equal(run.stage, "analyze");
assert.equal(run.intent.feedback, "the profile screen");

// implement_stuck bounces down to analyze
run = start();
run = next(run, { type: "analyzed", payload: {} });
run = next(run, reply(true));
run = next(run, { type: "implement_stuck", payload: { question: "ambiguous spec" } });
assert.equal(run.stage, "analyze");

// confirm_done correction bounces back to implement
run = start();
run = next(run, { type: "analyzed", payload: {} });
run = next(run, reply(true));
run = next(run, { type: "implemented", payload: { branch: "b" } });
run = next(run, { type: "qa_result", payload: { pass: true } });
run = next(run, { type: "shipped", payload: { prUrl: "p" } });
run = next(run, reply(false, "padding is off"));
assert.equal(run.stage, "implement");

// prod guard
assertNotProd({ environment: "staging", host: "db.staging.internal" }); // ok
assert.throws(() => assertNotProd({ environment: "production" }), ProdGuardError);
assert.throws(() => assertNotProd({ host: "api.prod.example.com" }), ProdGuardError);
assertNotProd({ host: "api.prod.example.com", allowProd: true }); // explicit override ok

console.log("ok — all state-machine assertions passed");
