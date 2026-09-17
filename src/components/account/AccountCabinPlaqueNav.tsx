import { CabinPlaqueForm } from "@/components/CabinPlaqueForm";
import { CABIN_PLAQUE_LEAD } from "@/lib/cabin-plaque";

/**
 * Slice 14.12 — only loaded when TRUCK_EXISTS is true via AccountTruckExistsNavSlot.
 */
export function AccountCabinPlaqueNav() {
  return (
    <section
      id="cabin-plaque"
      className="account-cabin-plaque"
      aria-labelledby="account-cabin-plaque-title"
      data-testid="account-cabin-plaque-nav"
    >
      <h2 id="account-cabin-plaque-title" className="auth-subhead">
        Cabin plaque
      </h2>
      <p className="auth-hint" data-testid="account-cabin-plaque-lead">
        {CABIN_PLAQUE_LEAD}
      </p>
      <CabinPlaqueForm />
    </section>
  );
}
