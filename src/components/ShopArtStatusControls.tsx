"use client";

import { useActionState } from "react";
import {
  markShopArtStatusAction,
  type ShopArtStatusActionState,
} from "@/app/actions/shop-art-status";
import type { ShopArtStatus } from "@/lib/shop-art-status";
import { SHOP_ART_STATUS_LABELS } from "@/lib/shop-art-status";

const initial: ShopArtStatusActionState = { ok: false };

/**
 * Slice 12.24 — partner marks approved art shop-ready / needs-fix.
 */
export function ShopArtStatusControls({
  bidId,
  status,
}: {
  bidId: string;
  status: ShopArtStatus;
}) {
  const [state, action, pending] = useActionState(
    markShopArtStatusAction,
    initial,
  );
  const current = state.status ?? status;

  return (
    <div
      className="shop-art-status"
      data-testid={`shop-art-status-${bidId}`}
      data-status={current}
    >
      <p className="auth-hint" data-testid={`shop-art-status-label-${bidId}`}>
        Art mark: {SHOP_ART_STATUS_LABELS[current]}
      </p>
      <div className="shop-art-status-actions">
        <form action={action}>
          <input type="hidden" name="bidId" value={bidId} />
          <input type="hidden" name="status" value="shop-ready" />
          <button
            type="submit"
            className="btn btn-ghost"
            disabled={pending || current === "shop-ready"}
            data-testid={`shop-art-mark-ready-${bidId}`}
          >
            Mark shop-ready
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="bidId" value={bidId} />
          <input type="hidden" name="status" value="needs-fix" />
          <button
            type="submit"
            className="btn btn-ghost"
            disabled={pending || current === "needs-fix"}
            data-testid={`shop-art-mark-fix-${bidId}`}
          >
            Mark needs-fix
          </button>
        </form>
      </div>
      {state.error ? (
        <p
          className="auth-error"
          role="alert"
          data-testid={`shop-art-status-error-${bidId}`}
        >
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="auth-hint" data-testid={`shop-art-status-message-${bidId}`}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
