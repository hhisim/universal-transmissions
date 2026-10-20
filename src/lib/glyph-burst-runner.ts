/**
 * glyph-burst-runner.ts — the burst as a cancellable sequence, with one way out.
 *
 * The first implementation had a cancellation gap: the visibility handler cleared the displayed
 * phase without cancelling the scheduled sequence, so hiding during the first phase and returning
 * before its timer fired let the next phase reappear. Reduced motion was sampled once, before the
 * idle wait, so switching it on before playback — or during it — never stopped anything, and the
 * idle handle was never cancelled on cleanup.
 *
 * This module owns the sequence. Everything that stops the burst goes through `cancel()`, which
 * settles the title exactly once, clears the pending idle callback and timer, and refuses to allow
 * any later phase. The scheduler and the environment are injected so the lifecycle can be driven
 * deterministically in tests rather than inferred from boolean predicates.
 */

import type { BurstPhase, GlyphIntensity } from "./glyph-burst";

export interface BurstScheduler {
  schedule(fn: () => void, ms: number): number;
  cancelSchedule(handle: number): void;
  scheduleAfterIdle(fn: () => void, timeoutMs: number): number;
  cancelIdle(handle: number): void;
}

export interface BurstEnvironment {
  isReducedMotion(): boolean;
  isHidden(): boolean;
}

export interface BurstRunner {
  /** Settle the title, clear pending work, and forbid any further phase. Idempotent. */
  cancel(): void;
  cancelled(): boolean;
  /** Phases emitted so far — order and count are observable for verification. */
  emitted(): GlyphIntensity[];
}

export interface StartBurstOptions {
  plan: BurstPhase[];
  scheduler: BurstScheduler;
  environment: BurstEnvironment;
  onPhase: (phase: GlyphIntensity | null) => void;
  /** How long the idle wait may be deferred before starting anyway. */
  idleTimeoutMs?: number;
}

export function startBurst({
  plan,
  scheduler,
  environment,
  onPhase,
  idleTimeoutMs = 1200,
}: StartBurstOptions): BurstRunner {
  let cancelled = false;
  let settled = false;
  let index = 0;
  let timerHandle: number | undefined;
  let idleHandle: number | undefined;
  const emitted: GlyphIntensity[] = [];

  const clearPending = () => {
    if (timerHandle !== undefined) {
      scheduler.cancelSchedule(timerHandle);
      timerHandle = undefined;
    }
    if (idleHandle !== undefined) {
      scheduler.cancelIdle(idleHandle);
      idleHandle = undefined;
    }
  };

  /** The single cancellation path. Everything else delegates to it. */
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    clearPending();
    if (!settled) {
      settled = true;
      onPhase(null);
    }
  };

  const finish = () => {
    if (settled) return;
    settled = true;
    onPhase(null);
  };

  /** Eligibility is re-checked at the moment playback would start, not when it was scheduled. */
  function beginIfEligible() {
    idleHandle = undefined;
    if (cancelled) return;
    if (environment.isReducedMotion() || environment.isHidden()) {
      cancel();
      return;
    }
    step();
  }

  function step() {
    timerHandle = undefined;
    if (cancelled) return;
    /* Re-checked on every step, so a change that arrives mid-burst stops it here even if the
       listener that would have called cancel() never fired. */
    if (environment.isReducedMotion() || environment.isHidden()) {
      cancel();
      return;
    }
    if (index >= plan.length) {
      finish();
      return;
    }
    const current = plan[index];
    index += 1;
    emitted.push(current.intensity);
    onPhase(current.intensity);
    if (index >= plan.length) {
      /* The last phase still holds for its duration, then settles. */
      timerHandle = scheduler.schedule(() => {
        timerHandle = undefined;
        if (cancelled) return;
        if (environment.isReducedMotion() || environment.isHidden()) {
          cancel();
          return;
        }
        finish();
      }, current.ms);
      return;
    }
    timerHandle = scheduler.schedule(step, current.ms);
  }

  idleHandle = scheduler.scheduleAfterIdle(beginIfEligible, idleTimeoutMs);

  return {
    cancel,
    cancelled: () => cancelled,
    emitted: () => emitted.slice(),
  };
}

/** The browser scheduler, kept separate so tests can drive a controlled one. */
export function windowScheduler(win: Window): BurstScheduler {
  const rich = win as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
  return {
    schedule: (fn, ms) => win.setTimeout(fn, ms),
    cancelSchedule: (handle) => win.clearTimeout(handle),
    scheduleAfterIdle: (fn, timeoutMs) => {
      if (typeof rich.requestIdleCallback === "function") {
        return rich.requestIdleCallback(fn, { timeout: timeoutMs });
      }
      return win.setTimeout(fn, 200);
    },
    cancelIdle: (handle) => {
      if (typeof rich.cancelIdleCallback === "function") rich.cancelIdleCallback(handle);
      win.clearTimeout(handle);
    },
  };
}
