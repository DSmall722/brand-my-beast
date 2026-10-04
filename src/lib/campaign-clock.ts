/**
 * Runtime clock for the deposit desk.
 * Production ignores the preview override. Tests set the override in-process.
 */

import { CLOSE_AT, OPEN_AT } from "./campaign";
import {
  campaignPhase,
  campaignWindowSentence,
  type CampaignPhase,
} from "./campaign-window";

const globalStore = globalThis as typeof globalThis & {
  __bmbCampaignClock?: {
    live: boolean | null;
    nowMs: number | null;
    previewOpen: boolean | null;
  };
};

function clockSlot() {
  if (!globalStore.__bmbCampaignClock) {
    globalStore.__bmbCampaignClock = {
      live: null,
      nowMs: null,
      previewOpen: null,
    };
  }
  return globalStore.__bmbCampaignClock;
}

export function resetCampaignClockForTests(): void {
  globalStore.__bmbCampaignClock = {
    live: null,
    nowMs: null,
    previewOpen: null,
  };
}

export function setCampaignClockForTests(input: {
  live?: boolean;
  now?: string | null;
  previewOpen?: boolean;
}): void {
  const slot = clockSlot();
  if (input.live !== undefined) slot.live = input.live;
  if (input.previewOpen !== undefined) slot.previewOpen = input.previewOpen;
  if (input.now === null) slot.nowMs = null;
  if (typeof input.now === "string") {
    const ms = Date.parse(input.now);
    if (!Number.isFinite(ms)) {
      throw new Error("Campaign clock now must be an ISO timestamp.");
    }
    slot.nowMs = ms;
  }
}

export function resolveNowMs(nowMs: number = Date.now()): number {
  return clockSlot().nowMs ?? nowMs;
}

export function resolveLiveBidding(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const override = clockSlot().live;
  if (override != null) return override;
  if (env.VERCEL_ENV === "production") {
    return env.LIVE_BIDDING === "true" || env.LIVE_BIDDING === "1";
  }
  return env.LIVE_BIDDING === "true" || env.LIVE_BIDDING === "1";
}

/**
 * Preview-only hatch so a test card can run before the published open.
 * Ignored on production.
 */
export function resolvePreviewBiddingOpen(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.VERCEL_ENV === "production") return false;
  const override = clockSlot().previewOpen;
  if (override != null) return override;
  if (env.VERCEL_ENV !== "preview") return false;
  return (
    env.PREVIEW_BIDDING_OPEN === "true" || env.PREVIEW_BIDDING_OPEN === "1"
  );
}

export function resolveCampaignPhase(
  bidTimes: readonly string[] = [],
  nowMs: number = resolveNowMs(),
): CampaignPhase {
  return campaignPhase({
    nowMs,
    liveBidding: resolveLiveBidding(),
    previewOpen: resolvePreviewBiddingOpen(),
    openAt: OPEN_AT,
    closeAt: CLOSE_AT ?? OPEN_AT,
    bidTimes,
  });
}

export function resolveCampaignWindowSentence(
  bidTimes: readonly string[] = [],
): string {
  return campaignWindowSentence(resolveCampaignPhase(bidTimes));
}

export function depositDeskOpen(bidTimes: readonly string[] = []): boolean {
  return resolveCampaignPhase(bidTimes).kind === "open";
}
