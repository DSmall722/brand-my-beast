import { TRUCK_EXISTS } from "@/lib/campaign";

export async function AccountTruckExistsNavSlot() {
  if (!TRUCK_EXISTS) return null;

  const { AccountCabinPlaqueNav } = await import("./AccountCabinPlaqueNav");
  return <AccountCabinPlaqueNav />;
}
