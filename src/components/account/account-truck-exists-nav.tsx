import { TRUCK_EXISTS } from "@/lib/campaign";

/**
 * Slice 14.12 — cabin plaque stays off `/account` nav while TRUCK_EXISTS is
 * false. Dynamic import is intentional so account/page.tsx never statically
 * pulls CabinPlaqueForm or “Cabin plaque” chrome (13.30 source ban).
 */
export async function AccountTruckExistsNavSlot() {
  if (!TRUCK_EXISTS) return null;

  const { AccountCabinPlaqueNav } = await import("./AccountCabinPlaqueNav");
  return <AccountCabinPlaqueNav />;
}
