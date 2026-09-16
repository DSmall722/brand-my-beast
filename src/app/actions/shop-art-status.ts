"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { isShopPartnerEmail } from "@/lib/auth/shop-partner";
import type { ShopArtStatus } from "@/lib/shop-art-status";
import { setShopArtStatus } from "@/lib/shop-art-status-store";

export type ShopArtStatusActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  status?: ShopArtStatus;
  bidId?: string;
};

export async function markShopArtStatusAction(
  _prev: ShopArtStatusActionState,
  formData: FormData,
): Promise<ShopArtStatusActionState> {
  const session = await auth();
  if (!session?.user?.email || !isShopPartnerEmail(session.user.email)) {
    return { ok: false, error: "Shop partners only." };
  }

  const bidId = String(formData.get("bidId") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();
  if (!bidId) {
    return { ok: false, error: "Missing seat id." };
  }

  const result = await setShopArtStatus({
    bidId,
    status: statusRaw,
    actorEmail: session.user.email,
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/partner/shop");
  return {
    ok: true,
    bidId: result.row.bidId,
    status: result.row.status,
    message: `Art marked ${result.row.status}. Still no card capture.`,
  };
}
